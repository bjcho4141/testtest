/**
 * 페어 재변환 — status 를 'pending' 으로 되돌려 워커가 다시 가져가게
 *
 * 본인 채널만 가능. 기존 conversion_jobs 는 그대로 두고 새 attempt 로 시작.
 * (워커의 cli/jobs/claim 이 INSERT 시 23505 면 다른 워커 선점 처리 — 여기선 단순 status 만 변경)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("shorts_pairs")
    .select("id, channels(owner_id)")
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });
  type Row = { id: string; channels: { owner_id: string } | null };
  const row = data as Row;
  if (!row.channels || row.channels.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  // 기존 진행 중 job 정리 (running → failed)
  await admin
    .from("conversion_jobs")
    .update({ status: "failed", error_message: "retry triggered", finished_at: new Date().toISOString() } as never)
    .eq("pair_id", id)
    .eq("status", "running");

  // 페어 status 되돌림
  const { error: updErr } = await admin
    .from("shorts_pairs")
    .update({ status: "pending" } as never)
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // 알림 로그
  await admin.from("agent_logs").insert({
    pair_id: id,
    from_actor: "user",
    to_actor: "system",
    type: "command",
    message: "재변환 요청 — 워커가 다음 사이클에 다시 가져갑니다",
  } as never);

  return NextResponse.json({ ok: true });
}
