/**
 * 채널 CRUD (PRD §3.2)
 *
 * - GET   : 본인 채널 목록 (RLS 자동 필터)
 * - POST  : 채널 신규 등록 (slug 형식·길이 검증)
 *
 * RLS: own channels select/insert (is_paid 게이트)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SLUG_REGEX = /^[a-z0-9-]+$/;
const SLUG_MIN = 2;
const SLUG_MAX = 40;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("channels")
    .select("id, name, slug, description, upload_paused, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ channels: data ?? [] });
}

export async function POST(request: NextRequest) {
  let body: { name?: string; slug?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  const slug = (body.slug ?? "").trim().toLowerCase();
  const description = (body.description ?? "").trim() || null;

  if (!name || name.length > 80) {
    return NextResponse.json({ error: "name 1~80자" }, { status: 400 });
  }
  if (!SLUG_REGEX.test(slug) || slug.length < SLUG_MIN || slug.length > SLUG_MAX) {
    return NextResponse.json(
      { error: `slug: 소문자/숫자/하이픈, ${SLUG_MIN}~${SLUG_MAX}자` },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("channels")
    .insert({ owner_id: user.id, name, slug, description } as never)
    .select("id, name, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 사용 중인 slug 입니다" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, channel: data });
}
