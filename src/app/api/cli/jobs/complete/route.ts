/**
 * 변환 워커 — 단계별 완료 보고
 *
 * body: { pairId, stage, status: 'done'|'failed', error?, artifactPath?, finalStatus? }
 *   finalStatus 가 있으면 shorts_pairs.status 도 함께 갱신 ('review' 등)
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

  // 1차: running row UPDATE (claim 단계에서 INSERT 한 download 등)
  const { count } = await admin
    .from("conversion_jobs")
    .update({
      status,
      finished_at: finishedAt,
      error_message: error ?? null,
      artifact_path: artifactPath ?? null,
      metadata: metadata as never,
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
      metadata: metadata as never,
    } as never);
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
