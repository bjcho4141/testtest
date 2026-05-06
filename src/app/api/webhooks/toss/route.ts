/**
 * 토스페이먼츠 Webhook (PRD §16.7 / security-team F-2)
 *
 * 흐름:
 *   1. (옵션) HMAC 시그니처 검증 — TOSS_WEBHOOK_SECRET 등록 시
 *   2. webhook_events 테이블 멱등성 체크 (UNIQUE(payment_key, status))
 *   3. status 별 분기:
 *      - DONE         → payments UPDATE + profiles.paid_until 연장
 *      - CANCELED     → payments UPDATE
 *      - PARTIAL_CANCELED / FAILED → 로그
 *
 * 토스 콘솔: Webhook URL = https://<도메인>/api/webhooks/toss
 *           HMAC 시크릿 발급 → TOSS_WEBHOOK_SECRET 환경변수
 */
import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { isProduction } from "@/lib/env";

type TossWebhookBody = {
  eventType?: string;
  createdAt?: string;
  data?: {
    paymentKey?: string;
    orderId?: string;
    status?: string;
    totalAmount?: number;
    method?: string;
    approvedAt?: string;
    [k: string]: unknown;
  };
};

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.TOSS_WEBHOOK_SECRET;
  // production 에서 secret 미설정 시 fail-closed (security-team F-2)
  // dev 에서는 도메인 등록 전 임시 통과 허용
  if (!secret) return !isProduction;
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const sig =
    request.headers.get("toss-signature") ??
    request.headers.get("x-toss-signature") ??
    null;

  if (!verifySignature(raw, sig)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: TossWebhookBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const data = body.data ?? {};
  const paymentKey = data.paymentKey;
  const status = data.status;
  if (!paymentKey || !status) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 멱등성: webhook_events UNIQUE(payment_key, status) 활용
  const { error: dedupErr } = await admin
    .from("webhook_events")
    .insert({
      payment_key: paymentKey,
      status,
      raw_payload: body as never,
    } as never);

  if (dedupErr) {
    if (dedupErr.code === "23505") {
      return NextResponse.json({ ok: true, dedup: true });
    }
    return NextResponse.json(
      { error: `dedup insert: ${dedupErr.message}` },
      { status: 500 },
    );
  }

  if (status === "DONE" && data.orderId) {
    const { data: pay } = await admin
      .from("payments")
      .select("user_id, amount")
      .eq("order_id", data.orderId)
      .single();

    if (pay) {
      const userId = (pay as { user_id: string }).user_id;
      await admin
        .from("payments")
        .update({
          status,
          method: data.method ?? null,
          approved_at: data.approvedAt ?? null,
        } as never)
        .eq("order_id", data.orderId);

      const paidUntil = new Date();
      paidUntil.setMonth(paidUntil.getMonth() + 1);
      await admin
        .from("profiles")
        .update({
          paid_until: paidUntil.toISOString(),
          subscription_status: "active",
        } as never)
        .eq("id", userId);
    }
  } else if (status === "CANCELED" || status === "PARTIAL_CANCELED") {
    await admin
      .from("payments")
      .update({ status } as never)
      .eq("payment_key", paymentKey);
  }

  return NextResponse.json({ ok: true });
}
