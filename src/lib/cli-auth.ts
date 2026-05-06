/**
 * CLI 워커 인증 (PRD §6.2 / §18.1, security-team 차단 사항)
 *
 * - Bearer 토큰 (constant-time 비교)
 * - IP allowlist (CIDR prefix — 단순 매칭)
 *
 * Mac mini 변환 워커 → Vercel API 호출 시 사용
 *   curl -H "Authorization: Bearer $CLI_SHARED_SECRET" ...
 */
import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function ipAllowed(req: NextRequest): boolean {
  const allowed = (process.env.CLI_ALLOWED_IPS ?? "127.0.0.1/32")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const ip = (xff.split(",")[0] || "").trim() || "127.0.0.1";
  for (const cidr of allowed) {
    const [base] = cidr.split("/");
    if (ip === base) return true;
    if (cidr === "127.0.0.1/32" && (ip === "127.0.0.1" || ip === "::1")) {
      return true;
    }
  }
  return false;
}

export type CliAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function verifyCliRequest(req: NextRequest): CliAuthResult {
  if (!ipAllowed(req)) {
    return { ok: false, status: 403, error: "ip not allowed" };
  }
  const secret = process.env.CLI_SHARED_SECRET;
  if (!secret) {
    return { ok: false, status: 503, error: "CLI_SHARED_SECRET missing" };
  }
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/);
  if (!m) {
    return { ok: false, status: 401, error: "missing bearer" };
  }
  if (!safeEqual(m[1], secret)) {
    return { ok: false, status: 401, error: "invalid bearer" };
  }
  return { ok: true };
}
