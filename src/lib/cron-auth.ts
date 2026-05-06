/**
 * Vercel Cron 인증 (security-team F-3)
 *
 * - production: CRON_SECRET 미설정 시 fail-closed (401)
 * - dev / preview: secret 미설정 시 통과 (개발 편의)
 *
 * Vercel Cron 은 자동으로 `Authorization: Bearer ${CRON_SECRET}` 첨부.
 */
import "server-only";
import type { NextRequest } from "next/server";
import { isProduction } from "@/lib/env";

export function checkCronAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return !isProduction;
  return (req.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}
