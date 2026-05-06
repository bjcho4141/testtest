/**
 * 슈퍼어드민 테스트 로그인 — DEV 전용 (PRD §18.5)
 *
 * 가드 5중:
 *   1. next.config.ts: production 빌드 시 NEXT_PUBLIC_ALLOW_TEST_LOGIN=true 면 빌드 실패
 *   2. 런타임 가드: VERCEL_ENV !== production && NODE_ENV !== production
 *   3. NEXT_PUBLIC_ALLOW_TEST_LOGIN === 'true' 명시
 *   4. IP allowlist (CLI_ALLOWED_IPS, 기본 127.0.0.1/32)
 *   5. 1시간 만료 토큰 (Supabase 세션 자체 만료 + cookie maxAge=3600)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isProduction, isTestLoginEnabled } from "@/lib/env";

const SUPERADMIN_EMAIL = "bjcho9542@gmail.com";

function ipAllowed(req: NextRequest): boolean {
  const allowed = (process.env.CLI_ALLOWED_IPS ?? "127.0.0.1/32")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const xff = req.headers.get("x-forwarded-for") ?? "";
  const ip = (xff.split(",")[0] || "").trim() || "127.0.0.1";

  // CIDR 매칭은 단순 prefix 비교 (운영에서 정밀 매칭 필요 시 cidr-matcher 추가)
  for (const cidr of allowed) {
    const [base] = cidr.split("/");
    if (ip === base) return true;
    if (cidr === "127.0.0.1/32" && (ip === "127.0.0.1" || ip === "::1")) {
      return true;
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  // 가드 #2 — 런타임 production 차단 (이중화)
  if (isProduction) {
    console.error(
      "[test-login] BLOCKED: production runtime detected. " +
        "VERCEL_ENV=" +
        process.env.VERCEL_ENV +
        " NODE_ENV=" +
        process.env.NODE_ENV,
    );
    return NextResponse.json(
      { error: "test-login is disabled in production" },
      { status: 500 },
    );
  }

  // 가드 #3 — 명시적 옵트인
  if (!isTestLoginEnabled) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_ALLOW_TEST_LOGIN must be 'true' in dev" },
      { status: 403 },
    );
  }

  // 가드 #4 — IP allowlist
  if (!ipAllowed(request)) {
    return NextResponse.json({ error: "ip not allowed" }, { status: 403 });
  }

  const admin = createAdminClient();

  // magic link 생성 (1시간 만료는 Supabase 기본)
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: SUPERADMIN_EMAIL,
    options: { redirectTo: `${request.nextUrl.origin}/auth/callback` },
  });

  if (error) {
    console.error("[test-login] generateLink error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    actionLink: data.properties?.action_link,
    expiresIn: 3600,
  });
}
