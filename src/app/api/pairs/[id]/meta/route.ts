/**
 * 페어 메타 편집 — 결과 영상 업로드 시 사용할 제목/설명/태그
 *
 * 저장: shorts_pairs.original_meta.result = { title, description, tags }
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { title?: string; description?: string; tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const title = (body.title ?? "").trim().slice(0, 100);
  const description = (body.description ?? "").trim().slice(0, 5000);
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
    : [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("shorts_pairs")
    .select("id, original_meta, channels(owner_id)")
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });
  type Row = { id: string; original_meta: Record<string, unknown> | null; channels: { owner_id: string } | null };
  const row = data as Row;
  if (!row.channels || row.channels.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const newMeta = {
    ...(row.original_meta ?? {}),
    result: { title, description, tags },
  };

  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from("shorts_pairs")
    .update({ original_meta: newMeta } as never)
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, meta: newMeta.result });
}
