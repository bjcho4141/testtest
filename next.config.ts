import type { NextConfig } from "next";

// production 빌드 가드 — 슈퍼어드민 테스트 로그인 우회 차단 (PRD §18.5)
if (
  process.env.VERCEL_ENV === "production" &&
  process.env.NEXT_PUBLIC_ALLOW_TEST_LOGIN === "true"
) {
  throw new Error(
    "SECURITY: NEXT_PUBLIC_ALLOW_TEST_LOGIN must be false in production",
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes는 라우트 안정화 후 Phase 3에서 켤 예정
};

export default nextConfig;
