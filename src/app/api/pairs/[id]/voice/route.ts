/**
 * 페어별 voice_id / TTS model 설정
 * 저장: shorts_pairs.original_meta.voice = { voice_id, model_id? }
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { voice_id?: string; model_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const voiceId = (body.voice_id ?? "").trim();
  const modelId = (body.model_id ?? "eleven_multilingual_v2").trim();

  if (voiceId && !/^[A-Za-z0-9]{15,40}$/.test(voiceId)) {
    return NextResponse.json({ error: "voice_id 형식 오류 (영숫자 15~40자)" }, { status: 400 });
  }

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
    voice: voiceId ? { voice_id: voiceId, model_id: modelId } : undefined,
  };

  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from("shorts_pairs")
    .update({ original_meta: newMeta } as never)
    .eq("id", id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
