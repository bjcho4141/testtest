/**
 * 변환 워커 — 다음 작업 claim
 *
 * 흐름: status='pending' shorts_pairs 1건 → conversion_jobs INSERT (download stage)
 *      ON CONFLICT (pair_id, stage, attempt) DO NOTHING (race 방지)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCliRequest } from "@/lib/cli-auth";

export async function POST(request: NextRequest) {
  const auth = verifyCliRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { workerId?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const workerId = body.workerId ?? "anonymous-worker";

  const admin = createAdminClient();

  // pending → queued 전이 + 1건 선점
  const { data: pair, error } = await admin
    .from("shorts_pairs")
    .select("id, channel_id, korean_url, original_url, license_source")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !pair) {
    return NextResponse.json({ ok: true, pair: null });
  }
  const p = pair as {
    id: string;
    channel_id: string;
    korean_url: string;
    original_url: string | null;
    license_source: string;
  };

  // race: 다른 워커가 이미 같은 pair 를 선점한 경우 conversion_jobs UNIQUE
  // (pair_id, stage, attempt) 23505 → null 반환 (이번 워커는 다음 사이클에 다시 시도)
  const { error: insErr } = await admin.from("conversion_jobs").insert({
    pair_id: p.id,
    stage: "download",
    status: "running",
    claimed_by: workerId,
    claimed_at: new Date().toISOString(),
    attempt: 1,
    started_at: new Date().toISOString(),
  } as never);

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({ ok: true, pair: null });
    }
    return NextResponse.json(
      { error: `claim insert: ${insErr.message}` },
      { status: 500 },
    );
  }

  await admin
    .from("shorts_pairs")
    .update({ status: "queued" } as never)
    .eq("id", p.id);

  return NextResponse.json({ ok: true, pair: p });
}
