/**
 * Supabase server client — RSC / Route Handler / Server Action 용
 *
 * Next.js 16: cookies() 는 async API. 호출자도 async 여야 한다.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component 에서 set 호출 시 throw — 무시 (미들웨어가 갱신)
          }
        },
      },
    },
  );
}

/**
 * Service-role client — RLS 우회 (서버 전용, 절대 클라이언트 노출 금지)
 */
export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "[supabase/admin] SUPABASE_SERVICE_ROLE_KEY is required server-side",
    );
  }
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    },
  );
}
