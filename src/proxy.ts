/**
 * Next.js 16 Proxy (구 middleware — 16.x 부터 proxy 명칭 표준)
 *
 * - 세션 갱신 + 결제 게이트 (helper: src/lib/supabase/proxy-helper.ts)
 * - matcher: /dashboard/* (단 /dashboard/billing 은 helper 내부 우회)
 * - runtime: Node.js (Supabase SSR 권고)
 */
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-helper";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
