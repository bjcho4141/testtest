/**
 * 환경변수 검증 — 시작 시점 fail-fast
 *
 * 서버 시작·빌드 시 필수 키 누락이면 즉시 throw.
 * NEXT_PUBLIC_* 는 클라이언트 번들에도 포함되므로 별도 분기.
 */

type EnvShape = {
  // Supabase (필수)
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  // 슈퍼어드민 테스트 로그인 (옵션)
  NEXT_PUBLIC_ALLOW_TEST_LOGIN?: string;
};

const REQUIRED_SERVER: ReadonlyArray<keyof EnvShape> = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function readEnv(): EnvShape {
  const missing: string[] = [];

  // 서버 측에서만 SERVICE_ROLE 검증 (클라이언트 번들에는 포함되지 않음)
  if (typeof window === "undefined") {
    for (const key of REQUIRED_SERVER) {
      if (!process.env[key]) missing.push(key);
    }
  } else {
    // 클라이언트 번들: PUBLIC 키만 검증
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      missing.push("NEXT_PUBLIC_SUPABASE_URL");
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables: ${missing.join(", ")}. ` +
        `Check .env.local against .env.example.`,
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    NEXT_PUBLIC_ALLOW_TEST_LOGIN: process.env.NEXT_PUBLIC_ALLOW_TEST_LOGIN,
  };
}

export const env = readEnv();

export const isProduction =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

export const isTestLoginEnabled =
  !isProduction && env.NEXT_PUBLIC_ALLOW_TEST_LOGIN === "true";
