/**
 * OAuth 콜백 — Supabase 카카오 로그인 후 리다이렉트 종착점
 *
 * 흐름:
 *   1. Supabase Auth → /auth/callback?code=xxx
 *   2. exchangeCodeForSession(code) 으로 세션 쿠키 발급
 *   3. ?next=/dashboard (있으면) 또는 / 로 리다이렉트
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/?login=error&reason=no_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange error:", error.message);
    return NextResponse.redirect(`${origin}/?login=error&reason=exchange`);
  }

  // open-redirect 방지: 절대 URL / 외부 도메인 차단
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
