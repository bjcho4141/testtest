/**
 * 페어 검수 반려 — review → failed
 *
 * 결과 영상이 마음에 안 들 때 페어 자체를 폐기 (재변환은 retry 로 별도)
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
  const { error: updErr } = await admin
    .from("shorts_pairs")
    .update({ status: "failed" } as never)
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await admin.from("agent_logs").insert({
    pair_id: id,
    from_actor: "user",
    to_actor: "system",
    type: "report",
    message: "❌ 검수 반려",
  } as never);

  return NextResponse.json({ ok: true });
}
