/**
 * 변환 결과 영상 signed URL 발급
 *
 * 본인 채널 페어인지 검증 → media-output 버킷의
 * {channel_slug}/{pair_id}/render/output.mp4 signed URL (15분 만료)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const SIGN_TTL_SEC = 60 * 15;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 페어 + 채널 조회 (RLS 가 자동으로 본인 것만 노출)
  const { data, error } = await supabase
    .from("shorts_pairs")
    .select("id, status, channels(slug, owner_id)")
    .eq("id", id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  type Row = { id: string; status: string; channels: { slug: string; owner_id: string } | null };
  const row = data as Row;
  if (!row.channels || row.channels.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const path = `${row.channels.slug}/${row.id}/render/output.mp4`;

  const admin = createAdminClient();
  const { data: signed, error: signErr } = await admin.storage
    .from("media-output")
    .createSignedUrl(path, SIGN_TTL_SEC);
  if (signErr || !signed) {
    return NextResponse.json(
      { error: `not yet rendered: ${signErr?.message ?? "no url"}`, status: row.status },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    url: signed.signedUrl,
    expiresIn: SIGN_TTL_SEC,
    pairStatus: row.status,
  });
}
