/**
 * 페어 검수 승인 — review → uploaded
 *
 * 사용자가 결과 영상 다운로드 후 본인 채널 업로드 끝낸 뒤 마킹.
 * 정식 자동 업로드 (Phase 5) 도입 전까지의 수동 트래킹.
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
    .select("id, status, channels(owner_id)")
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });
  type Row = { id: string; status: string; channels: { owner_id: string } | null };
  const row = data as Row;
  if (!row.channels || row.channels.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (row.status !== "review") {
    return NextResponse.json({ error: `review 상태에서만 가능 (현재: ${row.status})` }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from("shorts_pairs")
    .update({ status: "uploaded" } as never)
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await admin.from("agent_logs").insert({
    pair_id: id,
    from_actor: "user",
    to_actor: "system",
    type: "report",
    message: "✅ 검수 승인 — uploaded 로 마킹",
  } as never);

  return NextResponse.json({ ok: true });
}
