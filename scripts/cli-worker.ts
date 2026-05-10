/**
 * Mac mini CLI 변환 워커 (Phase B-④)
 *
 * 흐름:
 *   1. POST /api/cli/jobs/claim → pending 페어 1건 선점
 *   2. spawn `tsx scripts/09-styled-bench.ts` (PoC 디렉토리에서)
 *   3. PoC stdout 의 한 줄 JSON ({__stage: true, ...} / {__artifacts: true, ...}) 파싱
 *   4. stage 별 → POST /api/cli/jobs/complete (status=done)
 *   5. 산출물 (output.mp4, thumbnail.jpg) → Supabase Storage 업로드
 *   6. 최종 → POST /api/cli/jobs/complete (finalStatus='review', metadata.youtube_meta 등 첨부)
 *
 * Mac 1대 / 동시성=1. launchctl plist 가 KeepAlive 로 크래시 자동 재시작.
 *
 * 환경변수:
 *   WORKER_POC_PATH    PoC 저장소 절대경로 (기본: /Users/cho/Desktop/4141/poc-jp)
 *   WORKER_API_BASE    본 사이트 API base (기본: http://localhost:3000)
 *   WORKER_API_KEY     CLI_SHARED_SECRET (Bearer 인증)
 *   WORKER_ID          워커 식별자 (기본: local-mac-1)
 *
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — Storage 업로드용
 *
 * 진단 모드:
 *   tsx scripts/cli-worker.ts --once     // 1건만 처리 후 exit
 *   tsx scripts/cli-worker.ts --help     // 사용법 출력
 */
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

// launchd 환경(shell env 비어있음) 대비 .env.local / .env 자동 로드.
// 작업 디렉토리는 plist 의 WorkingDirectory (testtest 루트).
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: path.resolve(process.cwd(), ".env.local") });
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });

// ─────────────────────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────────────────────

const POC_PATH = process.env.WORKER_POC_PATH ?? "/Users/cho/Desktop/4141/poc-jp";
const API_BASE = (process.env.WORKER_API_BASE ?? "http://localhost:3000").replace(/\/$/, "");
const API_KEY = process.env.WORKER_API_KEY ?? "";
const WORKER_ID = process.env.WORKER_ID ?? "local-mac-1";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const POLL_INTERVAL_MS = 5000;

// ─────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────

type ClaimedPair = {
  id: string;
  channel_id: string;
  korean_url: string;
  original_url: string | null;
  license_source: string;
};

type ClaimResponse = { ok: true; pair: ClaimedPair | null } | { error: string };

type StageEvent = {
  __stage: true;
  stage: string;
  event: "start" | "done" | "failed";
  ts: number;
  error?: string;
  /** stage 가 만든 산출 파일 (working dir 기준 상대경로). PoC 09-styled-bench done emit 에서 동봉. */
  files?: string[];
};

type WorkEvent = {
  __work: true;
  /** PoC main() 시작 직후 1회 emit — 이후 StageEvent.files (상대경로) 의 prefix. */
  outDir: string;
};

type ArtifactsEvent = {
  __artifacts: true;
  outDir: string;
  videoPath: string;
  thumbnailPath: string;
  metaPath: string;
  elapsedSec: number;
};

type PocMeta = {
  koreanUrl: string;
  originalUrl: string;
  startSec: number;
  durSec: number;
  orientation: "vertical" | "horizontal";
  title: string;
  source: string;
  youtubeMeta?: { title: string; description: string; tags: string[] };
};

// ─────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────

function log(msg: string): void {
  console.log(`[worker ${new Date().toISOString()}] ${msg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function api<T>(p: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${p}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${p}: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

// ─────────────────────────────────────────────────────────────
// API 호출 helpers
// ─────────────────────────────────────────────────────────────

async function claimPair(): Promise<ClaimedPair | null> {
  const r = await api<ClaimResponse>("/api/cli/jobs/claim", { workerId: WORKER_ID });
  if ("error" in r) throw new Error(`claim: ${r.error}`);
  return r.pair;
}

async function reportStage(
  pairId: string,
  stage: string,
  status: "done" | "failed",
  extra: { error?: string; metadata?: Record<string, unknown>; finalStatus?: string } = {},
): Promise<void> {
  await api<{ ok: true }>("/api/cli/jobs/complete", {
    pairId,
    stage,
    status,
    ...extra,
  });
}

// ─────────────────────────────────────────────────────────────
// PoC 페어 정보 (channel slug 등) 조회
// ─────────────────────────────────────────────────────────────

async function fetchChannelSlug(channelId: string): Promise<string> {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from("channels")
    .select("slug")
    .eq("id", channelId)
    .single();
  if (error || !data) throw new Error(`channels.slug: ${error?.message ?? "not found"}`);
  return (data as { slug: string }).slug;
}

async function fetchPairConfig(pairId: string): Promise<{
  orientation: "vertical" | "horizontal";
  startSec: number;
  durSec: number;
}> {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb
    .from("shorts_pairs")
    .select("orientation, original_meta")
    .eq("id", pairId)
    .single();
  const row = data as {
    orientation?: string;
    original_meta?: { start_seconds?: number; duration?: number } | null;
  } | null;
  const orientation = row?.orientation === "horizontal" ? "horizontal" : "vertical";
  const meta = row?.original_meta ?? {};
  const startSec =
    typeof meta.start_seconds === "number" && Number.isFinite(meta.start_seconds)
      ? meta.start_seconds
      : 0;
  const durSec =
    typeof meta.duration === "number" && Number.isFinite(meta.duration) && meta.duration > 0
      ? meta.duration
      : 59;
  return { orientation, startSec, durSec };
}

// ─────────────────────────────────────────────────────────────
// PoC spawn + stdout 파싱
// ─────────────────────────────────────────────────────────────

type StreamHandlers = {
  onStage: (e: StageEvent) => void | Promise<void>;
  onArtifacts: (e: ArtifactsEvent) => void;
  onWork: (e: WorkEvent) => void;
};

function parseLines(buf: string, handlers: StreamHandlers): string {
  let rest = buf;
  let nl = rest.indexOf("\n");
  while (nl >= 0) {
    const line = rest.slice(0, nl).trim();
    rest = rest.slice(nl + 1);
    nl = rest.indexOf("\n");
    if (!line) continue;
    process.stdout.write(`  poc> ${line}\n`);
    if (line.startsWith("{") && line.endsWith("}")) {
      try {
        const obj = JSON.parse(line) as Partial<StageEvent & ArtifactsEvent & WorkEvent>;
        if (obj.__work === true && typeof obj.outDir === "string") {
          handlers.onWork(obj as WorkEvent);
        } else if (obj.__stage === true && typeof obj.stage === "string" && obj.event) {
          void handlers.onStage(obj as StageEvent);
        } else if (obj.__artifacts === true) {
          handlers.onArtifacts(obj as ArtifactsEvent);
        }
      } catch {
        // not our JSON line — ignore
      }
    }
  }
  return rest;
}

async function runPoc(args: {
  koreanUrl: string;
  originalUrl: string;
  startSec: number;
  durSec: number;
  orientation: "vertical" | "horizontal";
  onStage: (e: StageEvent, workOutDir: string | null) => Promise<void>;
}): Promise<ArtifactsEvent> {
  return new Promise<ArtifactsEvent>((resolve, reject) => {
    let artifacts: ArtifactsEvent | null = null;
    let workOutDir: string | null = null;
    let stdoutBuf = "";

    const child = spawn(
      "npx",
      [
        "tsx",
        path.join("scripts", "09-styled-bench.ts"),
        args.koreanUrl,
        args.originalUrl,
        String(args.startSec),
        String(args.durSec),
        args.orientation,
      ],
      {
        cwd: POC_PATH,
        env: process.env,
      },
    );

    child.stdout.on("data", (d: Buffer) => {
      stdoutBuf += d.toString();
      stdoutBuf = parseLines(stdoutBuf, {
        onStage: (e) => args.onStage(e, workOutDir),
        onArtifacts: (e) => {
          artifacts = e;
          // __artifacts 라인의 outDir 도 동일 — __work 누락 fallback.
          if (!workOutDir) workOutDir = e.outDir;
        },
        onWork: (e) => {
          workOutDir = e.outDir;
        },
      });
    });

    child.stderr.on("data", (d: Buffer) => {
      process.stderr.write(d);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`PoC exit ${code}`));
        return;
      }
      if (!artifacts) {
        reject(new Error("PoC done but no __artifacts line emitted"));
        return;
      }
      resolve(artifacts);
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Storage 업로드
// ─────────────────────────────────────────────────────────────

async function uploadFile(args: {
  bucket: string;
  remotePath: string;
  localPath: string;
  contentType: string;
}): Promise<void> {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const buf = await fs.readFile(args.localPath);
  const { error } = await sb.storage
    .from(args.bucket)
    .upload(args.remotePath, buf, {
      contentType: args.contentType,
      upsert: true,
    });
  if (error) throw new Error(`storage upload ${args.bucket}/${args.remotePath}: ${error.message}`);
}

// ─────────────────────────────────────────────────────────────
// 한 페어 처리
// ─────────────────────────────────────────────────────────────

async function processPair(pair: ClaimedPair): Promise<void> {
  log(`processing pair ${pair.id} (channel=${pair.channel_id})`);

  const slug = await fetchChannelSlug(pair.channel_id);
  const { orientation, startSec, durSec } = await fetchPairConfig(pair.id);
  log(`pair config: orientation=${orientation} start=${startSec}s dur=${durSec}s`);

  if (!pair.original_url) {
    throw new Error("pair.original_url missing");
  }

  // claim 단계에서 download running INSERT 했음 → done 보고.
  await reportStage(pair.id, "download", "done");

  const artifacts = await runPoc({
    koreanUrl: pair.korean_url,
    originalUrl: pair.original_url,
    startSec,
    durSec,
    orientation,
    onStage: async (e, workOutDir) => {
      if (e.event === "done") {
        // PoC 가 emit 한 files (상대경로) → workOutDir 기준 절대경로 변환.
        // workOutDir 미수신 (구 PoC) 또는 files 누락 시 빈 배열.
        const absFiles =
          workOutDir && Array.isArray(e.files)
            ? e.files.map((f) => path.join(workOutDir, f))
            : [];
        const extra =
          absFiles.length > 0 ? { metadata: { artifacts: absFiles } } : {};
        await reportStage(pair.id, e.stage, "done", extra).catch((err) =>
          log(`reportStage done error (non-fatal): ${err}`),
        );
      } else if (e.event === "failed") {
        await reportStage(pair.id, e.stage, "failed", { error: e.error }).catch((err) =>
          log(`reportStage failed error: ${err}`),
        );
      }
      // 'start' 는 본 사이트 측 stage row 가 claim/이전 보고로 생성되므로 별도 INSERT 안 함.
    },
  });

  // PoC meta.json 읽어서 youtube_meta 추출
  const metaRaw = await fs.readFile(artifacts.metaPath, "utf8");
  const meta = JSON.parse(metaRaw) as PocMeta;

  // Storage 업로드
  const videoRemote = `${slug}/${pair.id}/output.mp4`;
  const thumbRemote = `${slug}/${pair.id}/thumbnail.jpg`;
  log(`uploading video → media-output/${videoRemote}`);
  await uploadFile({
    bucket: "media-output",
    remotePath: videoRemote,
    localPath: artifacts.videoPath,
    contentType: "video/mp4",
  });
  log(`uploading thumbnail → thumbnails/${thumbRemote}`);
  await uploadFile({
    bucket: "thumbnails",
    remotePath: thumbRemote,
    localPath: artifacts.thumbnailPath,
    contentType: "image/jpeg",
  });

  // 최종 review 전이 — metadata 에 youtube_meta + storage_path 포함
  await reportStage(pair.id, "render", "done", {
    finalStatus: "review",
    metadata: {
      elapsed_sec: artifacts.elapsedSec,
      youtube_meta: meta.youtubeMeta ?? null,
      video_storage_path: `media-output/${videoRemote}`,
      thumbnail_storage_path: `thumbnails/${thumbRemote}`,
    },
  });

  log(`pair ${pair.id} → review (elapsed ${artifacts.elapsedSec}s)`);
}

// ─────────────────────────────────────────────────────────────
// 메인 루프
// ─────────────────────────────────────────────────────────────

function printHelp(): void {
  process.stdout.write(`Usage: tsx scripts/cli-worker.ts [--help] [--once]

Polls /api/cli/jobs/claim every ${POLL_INTERVAL_MS}ms and runs PoC per pair.

Env vars:
  WORKER_POC_PATH    (default: /Users/cho/Desktop/4141/poc-jp)
  WORKER_API_BASE    (default: http://localhost:3000)
  WORKER_API_KEY     CLI_SHARED_SECRET (required)
  WORKER_ID          (default: local-mac-1)
  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (required for Storage upload)

Flags:
  --help    Print this help.
  --once    Claim/process one pair (or exit if none) and quit.
`);
}

function checkEnv(): void {
  const missing: string[] = [];
  if (!API_KEY) missing.push("WORKER_API_KEY");
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_SERVICE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    throw new Error(`missing env: ${missing.join(", ")}`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }
  const once = argv.includes("--once");

  checkEnv();
  log(`started: poc=${POC_PATH} api=${API_BASE} workerId=${WORKER_ID} once=${once}`);

  // PoC 디렉토리 존재 확인
  try {
    await fs.access(path.join(POC_PATH, "scripts", "09-styled-bench.ts"));
  } catch {
    throw new Error(`PoC script not found at ${POC_PATH}/scripts/09-styled-bench.ts`);
  }

  while (true) {
    let pair: ClaimedPair | null = null;
    try {
      pair = await claimPair();
    } catch (e) {
      log(`claim error: ${e instanceof Error ? e.message : e}`);
      if (once) return;
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (!pair) {
      if (once) {
        log("no pending pair; --once exit");
        return;
      }
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    try {
      await processPair(pair);
    } catch (e) {
      log(`pair ${pair.id} failed: ${e instanceof Error ? e.message : e}`);
      try {
        await reportStage(pair.id, "render", "failed", {
          error: e instanceof Error ? e.message : String(e),
          finalStatus: "failed",
        });
      } catch (rerr) {
        log(`failed to report failure: ${rerr}`);
      }
    }

    if (once) return;
  }
}

main().catch((e) => {
  console.error(`[worker] fatal: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
