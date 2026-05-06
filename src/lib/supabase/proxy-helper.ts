/**
 * Supabase middleware helper — 세션 갱신 + 결제 게이트
 *
 * PRD §2.4 / §2.3:
 *   - /dashboard/* 보호. 단 /dashboard/billing 은 결제 게이트 우회 (loop 방지)
 *   - 미인증 → /?login=required
 *   - 인증됐으나 is_paid=false → /dashboard/billing?from=blocked
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

const PROTECTED_PREFIX = "/dashboard";
const BILLING_PATH = "/dashboard/billing";
const FREE_PAIR_LIMIT = 2;

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith(PROTECTED_PREFIX);
  const isBilling = path === BILLING_PATH || path.startsWith(`${BILLING_PATH}/`);

  // 보호 라우트인데 미인증 → 랜딩으로
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("login", "required");
    return NextResponse.redirect(url);
  }

  // 보호 라우트 + 인증됐고 + billing 페이지가 아닐 때만 결제 게이트
  if (isProtected && !isBilling && user) {
    // NOTE: 타입 stub과 supabase-js 제네릭 추론 격차 — gen types 적용 후 cast 제거
    const { data: paid, error } = await supabase.rpc(
      "is_paid",
      { uid: user.id } as never,
    );

    if (error) {
      console.error("[middleware] is_paid rpc error:", error.message);
      // RPC 실패 시 안전하게 결제 페이지로 (open-fail 방지)
      const url = request.nextUrl.clone();
      url.pathname = BILLING_PATH;
      url.searchParams.set("from", "rpc_error");
      return NextResponse.redirect(url);
    }

    if (!paid) {
      // 무료 2개 정책 — 미결제 사용자도 첫 2개 페어까지 사용 가능
      // (RLS 가 paid 일 때만 SELECT 허용 → admin 키로 직접 카운트)
      const admin = createSbClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
      const { count } = await admin
        .from("shorts_pairs")
        .select("id", { count: "exact", head: true })
        .eq("created_by", user.id);
      const freeCount = count ?? 0;
      if (freeCount < FREE_PAIR_LIMIT) {
        // 통과 (미결제 + 무료 잔여 있음)
        return response;
      }
      const url = request.nextUrl.clone();
      url.pathname = BILLING_PATH;
      url.searchParams.set("from", "blocked");
      return NextResponse.redirect(url);
    }
  }

  return response;
}
