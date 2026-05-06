/**
 * 슈퍼어드민 테스트 로그인 — DEV 전용 (PRD §18.5)
 *
 * 가드 5중:
 *   1. next.config.ts: production 빌드 시 NEXT_PUBLIC_ALLOW_TEST_LOGIN=true 면 빌드 실패
 *   2. 런타임 가드: VERCEL_ENV !== production && NODE_ENV !== production
 *   3. NEXT_PUBLIC_ALLOW_TEST_LOGIN === 'true' 명시
 *   4. IP allowlist (CLI_ALLOWED_IPS, 기본 127.0.0.1/32)
 *   5. 1시간 만료 토큰 (Supabase 세션 자체 만료)
 *
 * 흐름: admin.generateLink → token 추출 → /auth/v1/verify POST 직접 호출
 *       → access/refresh token 받아 SSR 클라로 setSession (쿠키 자동 set) → /dashboard redirect
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isProduction, isTestLoginEnabled } from "@/lib/env";
import { ipAllowed } from "@/lib/cli-auth";

const SUPERADMIN_EMAIL = "bjcho9542@gmail.com";

async function handle(request: NextRequest): Promise<NextResponse> {
  if (isProduction) {
    return NextResponse.json(
      { error: "test-login is disabled in production" },
      { status: 500 },
    );
  }
  if (!isTestLoginEnabled) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_ALLOW_TEST_LOGIN must be 'true' in dev" },
      { status: 403 },
    );
  }
  if (!ipAllowed(request)) {
    return NextResponse.json({ error: "ip not allowed" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: SUPERADMIN_EMAIL,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    return NextResponse.json(
      { error: linkErr?.message ?? "no hashed_token" },
      { status: 500 },
    );
  }

  // SSR 클라로 verifyOtp 호출 → 성공 시 cookieStore.set 자동 실행
  const supabase = await createClient();
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyErr) {
    return NextResponse.json(
      { error: `verifyOtp failed: ${verifyErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
}

export const GET = handle;
export const POST = handle;
