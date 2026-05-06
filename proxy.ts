/**
 * Next.js 16 Proxy (구 middleware.ts)
 *
 * - 세션 갱신 + 결제 게이트 (helper: src/lib/supabase/middleware.ts)
 * - matcher: /dashboard/* (단 /dashboard/billing 은 helper 내부 우회)
 * - runtime: Node.js (Supabase SSR 권고 — Edge 도 가능하나 확장성 고려 Node 고정)
 */
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-helper";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 보호 대상: /dashboard 이하 전부
     * (asset 경로 제외: _next/static, _next/image, favicon.ico, 이미지)
     */
    "/dashboard/:path*",
  ],
  runtime: "nodejs",
};
