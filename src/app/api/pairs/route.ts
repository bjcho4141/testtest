/**
 * 한·일 영상 페어 (PRD §3.2 shorts_pairs)
 *
 * 사업결정 1: license_source 는 'cc' / 'self_filmed' 만 허용 (creator_permission 제외)
 * INSERT 시 transformation_count=0 (분석 단계에서 >=6 강제)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const ALLOWED_LICENSE = ["cc", "self_filmed"] as const;
const ALLOWED_ORIENTATION = ["vertical", "horizontal"] as const;
const URL_REGEX = /^https?:\/\/[^\s]+$/i;
const FREE_PAIR_LIMIT = 2;

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
    orientation?: string;
    license_source?: string;
    license_evidence_url?: string;
    start_seconds?: number;
    duration?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const channelId = body.channel_id?.trim();
  const koreanUrl = body.korean_url?.trim();
  const originalUrl = body.original_url?.trim() || null;
  const orientation = (body.orientation?.trim() || "vertical") as string;
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
  if (!(ALLOWED_ORIENTATION as readonly string[]).includes(orientation)) {
    return NextResponse.json(
      { error: "orientation: 'vertical' 또는 'horizontal'" },
      { status: 400 },
    );
  }
  if (!licenseEvidenceUrl || !URL_REGEX.test(licenseEvidenceUrl)) {
    return NextResponse.json({ error: "license_evidence_url 필수" }, { status: 400 });
  }

  const startSeconds = typeof body.start_seconds === "number" ? body.start_seconds : 0;
  const duration = typeof body.duration === "number" ? body.duration : 59;
  if (startSeconds < 0 || duration < 5 || duration > 180) {
    return NextResponse.json({ error: "start_seconds≥0, duration 5~180" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // 채널 소유 확인 (admin 우회 — RLS 무관)
  const { data: ch } = await admin
    .from("channels")
    .select("id, owner_id")
    .eq("id", channelId)
    .single();
  type ChRow = { id: string; owner_id: string } | null;
  const channel = ch as ChRow;
  if (!channel || channel.owner_id !== user.id) {
    return NextResponse.json({ error: "채널 소유자 아님" }, { status: 403 });
  }

  // 무료 정책: 미결제면 페어 카운트 < FREE_PAIR_LIMIT 일 때만 허용
  const { data: paidGate } = await admin.rpc("is_paid", { uid: user.id } as never);
  const isPaid = Boolean(paidGate);
  if (!isPaid) {
    const { count } = await admin
      .from("shorts_pairs")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id);
    const used = count ?? 0;
    if (used >= FREE_PAIR_LIMIT) {
      return NextResponse.json(
        { error: `무료 ${FREE_PAIR_LIMIT}개 모두 사용함 — 결제 후 무제한`, billingRequired: true },
        { status: 402 },
      );
    }
  }

  const { data, error } = await admin
    .from("shorts_pairs")
    .insert({
      channel_id: channelId,
      korean_url: koreanUrl,
      original_url: originalUrl,
      orientation,
      license_source: licenseSource,
      license_evidence_url: licenseEvidenceUrl,
      original_meta: { start_seconds: startSeconds, duration },
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
