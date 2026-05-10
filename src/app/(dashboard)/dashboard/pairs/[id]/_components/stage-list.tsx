"use client";

/**
 * 변환 단계 7개 + 진행률 표시 (전체 % + stage 별 가중치).
 * 각 stage 의 산출물(중간 파일) 절대경로를 metadata.artifacts 에서 읽어 표시 +
 * 📂 버튼으로 macOS Finder 에서 파일 선택 상태로 열기 (DEV + 슈퍼어드민만).
 */
import { useTransition, useState } from "react";
import { FolderOpen } from "lucide-react";
import { revealInFinder } from "../_actions";

const STAGE_ORDER = [
  "download",
  "stt",
  "translation",
  "tts",
  "crop",
  "subtitle",
  "render",
] as const;

const STAGE_LABEL: Record<string, string> = {
  download: "다운로드",
  stt: "음성 인식",
  translation: "번역",
  tts: "일본어 TTS",
  crop: "9:16 크롭",
  subtitle: "자막",
  render: "렌더",
};

// 가중치 (총 100, 실제 처리 시간 비율 근사)
const STAGE_WEIGHT: Record<string, number> = {
  download: 15,
  stt: 15,
  translation: 10,
  tts: 15,
  crop: 15,
  subtitle: 5,
  render: 25,
};

const JOB_STATUS_CLS: Record<string, string> = {
  queued: "bg-neutral-100 text-neutral-700",
  running: "bg-blue-100 text-blue-800 animate-pulse",
  done: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
  pending: "bg-neutral-50 text-neutral-400",
};

const STATUS_LABEL: Record<string, string> = {
  queued: "대기",
  running: "진행 중…",
  done: "✓ 완료",
  failed: "✗ 실패",
  pending: "—",
};

export type StageJob = {
  id: string;
  stage: string;
  status: string;
  attempt: number;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
};

function basename(p: string): string {
  const i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return i >= 0 ? p.slice(i + 1) : p;
}

function ArtifactItem({ absPath }: { absPath: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const onClick = () => {
    setErr(null);
    startTransition(async () => {
      const r = await revealInFinder(absPath);
      if (!r.ok) setErr(r.error);
    });
  };

  return (
    <span className="inline-flex items-center gap-1 text-xs rounded bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5">
      <span className="font-mono break-all" title={absPath}>
        {basename(absPath)}
      </span>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        title={err ?? "Finder 에서 열기 (DEV 전용)"}
        className="ml-0.5 p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50"
        aria-label="Finder 에서 파일 열기"
      >
        <FolderOpen className="w-3.5 h-3.5" />
      </button>
      {err && <span className="text-[10px] text-red-600">{err}</span>}
    </span>
  );
}

export function StageList({ jobs }: { jobs: StageJob[] }) {
  // stage 별 최신 row 매핑
  const byStage = new Map<string, StageJob>();
  for (const j of jobs) {
    const prev = byStage.get(j.stage);
    if (!prev || (j.attempt ?? 1) > (prev.attempt ?? 1)) {
      byStage.set(j.stage, j);
    }
  }

  // 전체 진행률 계산
  let totalPct = 0;
  for (const s of STAGE_ORDER) {
    const j = byStage.get(s);
    const w = STAGE_WEIGHT[s] ?? 0;
    if (j?.status === "done") totalPct += w;
    else if (j?.status === "running") totalPct += w * 0.5; // 진행 중 = 절반 인정
  }
  const totalPctRound = Math.round(totalPct);
  const isAllDone = totalPctRound >= 100;
  const isFailed = STAGE_ORDER.some((s) => byStage.get(s)?.status === "failed");

  return (
    <div className="space-y-3">
      {/* 전체 진행률 바 */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold">전체 진행률</span>
          <span className={`font-mono font-semibold ${isFailed ? "text-red-600" : isAllDone ? "text-green-600" : "text-blue-600"}`}>
            {totalPctRound}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
          <div
            className={`h-full transition-all duration-500 ${
              isFailed ? "bg-red-500" : isAllDone ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${totalPctRound}%` }}
          />
        </div>
      </div>

      {/* stage 7개 카드 */}
      <ul className="rounded-md border divide-y" style={{ borderColor: "var(--border)" }}>
        {STAGE_ORDER.map((s, i) => {
          const j = byStage.get(s);
          const status = j?.status ?? "pending";
          const cls = JOB_STATUS_CLS[status] ?? "bg-neutral-100";
          const isRunning = status === "running";
          // stage 자체 진행률 (시뮬레이션)
          const stagePct =
            status === "done" ? 100 : status === "running" ? 50 : status === "failed" ? 0 : 0;

          // metadata.artifacts: string[] (절대경로). 없으면 빈 배열 — 회귀 안전.
          const artifacts = Array.isArray(
            (j?.metadata as { artifacts?: unknown } | null)?.artifacts,
          )
            ? ((j!.metadata as { artifacts: unknown[] }).artifacts.filter(
                (x): x is string => typeof x === "string" && x.length > 0,
              ))
            : [];

          return (
            <li
              key={s}
              className={`p-3 flex items-center gap-3 text-sm flex-wrap transition ${
                isRunning ? "bg-blue-50 dark:bg-blue-900/20" : ""
              }`}
            >
              <span className="text-xs font-mono w-6" style={{ color: "var(--muted)" }}>
                {i + 1}.
              </span>
              <span className="font-medium w-24">{STAGE_LABEL[s] ?? s}</span>
              <span className={`text-xs rounded px-2 py-0.5 ${cls}`}>
                {STATUS_LABEL[status] ?? status}
              </span>
              {/* stage 진행률 미니 바 */}
              <div className="flex-1 min-w-[80px] max-w-[120px] h-1.5 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    status === "done" ? "bg-green-500" : status === "running" ? "bg-blue-500 animate-pulse" : status === "failed" ? "bg-red-500" : "bg-transparent"
                  }`}
                  style={{ width: `${stagePct}%` }}
                />
              </div>
              <span className="text-xs font-mono w-10 text-right" style={{ color: "var(--muted)" }}>
                {stagePct}%
              </span>
              {j && j.attempt > 1 && (
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  ↻ {j.attempt}
                </span>
              )}
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {j?.finished_at
                  ? new Date(j.finished_at).toLocaleTimeString("ko-KR")
                  : j?.started_at
                    ? `${new Date(j.started_at).toLocaleTimeString("ko-KR")}`
                    : "—"}
              </span>
              {j?.error_message && (
                <p className="basis-full text-xs text-red-600 break-words">{j.error_message}</p>
              )}
              {artifacts.length > 0 && (
                <div className="basis-full pt-1 flex flex-wrap gap-1.5">
                  {artifacts.map((p) => (
                    <ArtifactItem key={p} absPath={p} />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
