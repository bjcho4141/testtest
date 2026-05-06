/**
 * 페어 삭제 — DB cascade (conversion_jobs / agent_logs 자동 삭제)
 *
 * Storage 객체는 별도 정리 cron 또는 onDelete 트리거 필요 (지금은 미정리).
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function DELETE(
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
  const { error: delErr } = await admin.from("shorts_pairs").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
