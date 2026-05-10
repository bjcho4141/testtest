/**
 * 변환 워커 — 단계별 완료 보고
 *
 * body: { pairId, stage, status: 'done'|'failed', error?, artifactPath?, finalStatus?, metadata? }
 *   finalStatus 가 있으면 shorts_pairs.status 도 함께 갱신 ('review' 등)
 *   metadata 안의 다음 키는 shorts_pairs.original_meta 로 머지:
 *     - youtube_meta: { title, description, tags } — 업로드 단계에서 그대로 사용
 *     - video_storage_path: string — 워커가 업로드한 mp4 의 Storage 경로
 *     - thumbnail_storage_path: string — 동일
 *   (나머지 metadata 키는 conversion_jobs.metadata jsonb 에만 저장)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCliRequest } from "@/lib/cli-auth";

const ALLOWED_STAGES = [
  "download",
  "stt",
  "translation",
  "tts",
  "demucs",
  "crop",
  "subtitle",
  "render",
  "review",
] as const;

const ALLOWED_FINAL = [
  "pending",
  "queued",
  "processing",
  "review",
  "uploaded",
  "published",
  "failed",
] as const;

export async function POST(request: NextRequest) {
  const auth = verifyCliRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  let body: {
    pairId?: string;
    stage?: string;
    status?: "done" | "failed";
    error?: string;
    artifactPath?: string;
    finalStatus?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { pairId, stage, status, error, artifactPath, finalStatus, metadata } = body;
  if (!pairId || !stage || !status) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!(ALLOWED_STAGES as readonly string[]).includes(stage)) {
    return NextResponse.json({ error: "invalid stage" }, { status: 400 });
  }
  if (status !== "done" && status !== "failed") {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const admin = createAdminClient();
  const finishedAt = new Date().toISOString();

  // 같은 (pair_id, stage) row 의 기존 metadata 와 머지 — 후속 호출이 artifacts 를 잃지 않도록.
  // (예: render done 1차에서 artifacts 저장 → 2차에서 elapsed_sec/youtube_meta 추가 보고 시 artifacts 보존)
  const { data: existingJob } = await admin
    .from("conversion_jobs")
    .select("metadata")
    .eq("pair_id", pairId)
    .eq("stage", stage)
    .order("attempt", { ascending: false })
    .limit(1)
    .maybeSingle();
  const existingMeta =
    ((existingJob as { metadata?: Record<string, unknown> } | null)?.metadata as
      | Record<string, unknown>
      | null) ?? null;
  const mergedJobMeta: Record<string, unknown> | null =
    metadata || existingMeta
      ? { ...(existingMeta ?? {}), ...(metadata ?? {}) }
      : null;

  // 1차: running row UPDATE (claim 단계에서 INSERT 한 download 등)
  const { count } = await admin
    .from("conversion_jobs")
    .update({
      status,
      finished_at: finishedAt,
      error_message: error ?? null,
      artifact_path: artifactPath ?? null,
      metadata: mergedJobMeta as never,
    } as never, { count: "exact" })
    .eq("pair_id", pairId)
    .eq("stage", stage)
    .eq("status", "running");

  // 매칭 row 없으면 (워커가 stt 등을 직접 INSERT 안 함) 새로 INSERT
  if ((count ?? 0) === 0) {
    await admin.from("conversion_jobs").insert({
      pair_id: pairId,
      stage,
      status,
      attempt: 1,
      started_at: finishedAt,
      finished_at: finishedAt,
      error_message: error ?? null,
      artifact_path: artifactPath ?? null,
      metadata: mergedJobMeta as never,
    } as never);
  }

  // metadata 의 youtube_meta / video_storage_path / thumbnail_storage_path 는
  // shorts_pairs.original_meta jsonb 에 머지 (review 화면이 이 위치에서 읽음).
  // 기존 키는 보존, 위 3개 키만 갱신.
  const meta = (metadata ?? {}) as {
    youtube_meta?: { title?: string; description?: string; tags?: string[] };
    video_storage_path?: string;
    thumbnail_storage_path?: string;
  };
  const hasMergeKeys =
    meta.youtube_meta !== undefined ||
    meta.video_storage_path !== undefined ||
    meta.thumbnail_storage_path !== undefined;

  if (hasMergeKeys) {
    const { data: pairRow } = await admin
      .from("shorts_pairs")
      .select("original_meta")
      .eq("id", pairId)
      .single();
    const existing =
      ((pairRow as { original_meta?: Record<string, unknown> } | null)
        ?.original_meta as Record<string, unknown> | null) ?? {};
    const merged: Record<string, unknown> = { ...existing };
    if (meta.youtube_meta !== undefined) merged.youtube_meta = meta.youtube_meta;
    if (meta.video_storage_path !== undefined) {
      merged.video_storage_path = meta.video_storage_path;
    }
    if (meta.thumbnail_storage_path !== undefined) {
      merged.thumbnail_storage_path = meta.thumbnail_storage_path;
    }
    await admin
      .from("shorts_pairs")
      .update({ original_meta: merged } as never)
      .eq("id", pairId);
  }

  if (finalStatus && (ALLOWED_FINAL as readonly string[]).includes(finalStatus)) {
    await admin
      .from("shorts_pairs")
      .update({ status: finalStatus } as never)
      .eq("id", pairId);
  } else if (status === "failed") {
    await admin
      .from("shorts_pairs")
      .update({ status: "failed" } as never)
      .eq("id", pairId);
  }

  return NextResponse.json({ ok: true });
}
