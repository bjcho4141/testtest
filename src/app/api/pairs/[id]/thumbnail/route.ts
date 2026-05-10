/**
 * 페어 썸네일 signed URL 발급
 *
 * 본인 채널 페어인지 검증 → thumbnails 버킷의
 * shorts_pairs.original_meta.thumbnail_storage_path signed URL (15분 만료)
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

  const { data, error } = await supabase
    .from("shorts_pairs")
    .select("id, status, original_meta, channels(slug, owner_id)")
    .eq("id", id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  type Row = {
    id: string;
    status: string;
    original_meta: Record<string, unknown> | null;
    channels: { slug: string; owner_id: string } | null;
  };
  const row = data as Row;
  if (!row.channels || row.channels.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const storagePath = row.original_meta?.thumbnail_storage_path;
  if (typeof storagePath !== "string" || !storagePath) {
    return NextResponse.json(
      { error: "no thumbnail yet", status: row.status },
      { status: 404 },
    );
  }

  // path 가 "thumbnails/..." 로 시작하면 버킷 prefix 제거
  const objectPath = storagePath.startsWith("thumbnails/")
    ? storagePath.slice("thumbnails/".length)
    : storagePath;

  const admin = createAdminClient();
  const { data: signed, error: signErr } = await admin.storage
    .from("thumbnails")
    .createSignedUrl(objectPath, SIGN_TTL_SEC);
  if (signErr || !signed) {
    return NextResponse.json(
      { error: `sign failed: ${signErr?.message ?? "no url"}` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    url: signed.signedUrl,
    expiresIn: SIGN_TTL_SEC,
  });
}
