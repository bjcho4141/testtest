/**
 * 한·일 영상 페어 (PRD §3.2 shorts_pairs)
 *
 * 사업결정 1: license_source 는 'cc' / 'self_filmed' 만 허용 (creator_permission 제외)
 * INSERT 시 transformation_count=0 (분석 단계에서 >=6 강제)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_LICENSE = ["cc", "self_filmed"] as const;
const URL_REGEX = /^https?:\/\/[^\s]+$/i;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("shorts_pairs")
    .select(
      "id, channel_id, korean_url, original_url, license_source, license_evidence_url, status, transformation_count, created_at, channels(slug, name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pairs: data ?? [] });
}

export async function POST(request: NextRequest) {
  let body: {
    channel_id?: string;
    korean_url?: string;
    original_url?: string;
    license_source?: string;
    license_evidence_url?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const channelId = body.channel_id?.trim();
  const koreanUrl = body.korean_url?.trim();
  const originalUrl = body.original_url?.trim() || null;
  const licenseSource = body.license_source?.trim();
  const licenseEvidenceUrl = body.license_evidence_url?.trim();

  if (!channelId) return NextResponse.json({ error: "channel_id 필수" }, { status: 400 });
  if (!koreanUrl || !URL_REGEX.test(koreanUrl)) {
    return NextResponse.json({ error: "korean_url: 유효한 URL" }, { status: 400 });
  }
  if (originalUrl && !URL_REGEX.test(originalUrl)) {
    return NextResponse.json({ error: "original_url: 유효한 URL" }, { status: 400 });
  }
  if (
    !licenseSource ||
    !(ALLOWED_LICENSE as readonly string[]).includes(licenseSource)
  ) {
    return NextResponse.json(
      { error: "license_source: 'cc' 또는 'self_filmed'" },
      { status: 400 },
    );
  }
  if (!licenseEvidenceUrl || !URL_REGEX.test(licenseEvidenceUrl)) {
    return NextResponse.json({ error: "license_evidence_url 필수" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 채널 소유 확인 (RLS 가 한 번 더 막지만 명시적 메시지)
  const { data: ch } = await supabase
    .from("channels")
    .select("id")
    .eq("id", channelId)
    .eq("owner_id", user.id)
    .single();
  if (!ch) {
    return NextResponse.json({ error: "채널 소유자 아님" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("shorts_pairs")
    .insert({
      channel_id: channelId,
      korean_url: koreanUrl,
      original_url: originalUrl,
      license_source: licenseSource,
      license_evidence_url: licenseEvidenceUrl,
      created_by: user.id,
      status: "pending",
      transformation_count: 0,
    } as never)
    .select("id, status")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, pair: data });
}
