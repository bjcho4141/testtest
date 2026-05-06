/**
 * 토스 결제 confirm — success page → 이 API → toss /v1/payments/confirm
 *
 * 흐름:
 *   1. 인증 확인 (createClient)
 *   2. 토스 confirm API 호출 (Idempotency-Key=paymentKey)
 *   3. payments 테이블 INSERT (admin client, RLS 우회)
 *   4. profiles paid_until 1개월 연장 + subscription_status=active
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { confirmTossPayment, SUBSCRIPTION_AMOUNT_KRW } from "@/lib/toss";

export async function POST(request: NextRequest) {
  let body: { paymentKey?: string; orderId?: string; amount?: number | string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { paymentKey, orderId, amount } = body;
  const amountNum = typeof amount === "string" ? parseInt(amount, 10) : amount;

  if (!paymentKey || !orderId || !amountNum || isNaN(amountNum)) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (amountNum !== SUBSCRIPTION_AMOUNT_KRW) {
    return NextResponse.json(
      { error: `amount mismatch (expected ${SUBSCRIPTION_AMOUNT_KRW})` },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let confirmation: Awaited<ReturnType<typeof confirmTossPayment>>;
  try {
    confirmation = await confirmTossPayment({
      paymentKey,
      orderId,
      amount: amountNum,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const admin = createAdminClient();

  const { error: insErr } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      payment_key: paymentKey,
      order_id: orderId,
      amount: amountNum,
      currency: "KRW",
      status: confirmation.status,
      method: confirmation.method ?? null,
      approved_at: confirmation.approvedAt ?? null,
      raw_response: confirmation as never,
    } as never);

  if (insErr && insErr.code !== "23505") {
    return NextResponse.json(
      { error: `payments insert failed: ${insErr.message}` },
      { status: 500 },
    );
  }

  if (confirmation.status === "DONE") {
    const paidUntil = new Date();
    paidUntil.setMonth(paidUntil.getMonth() + 1);
    const { error: profErr } = await admin
      .from("profiles")
      .update({
        paid_until: paidUntil.toISOString(),
        subscription_status: "active",
      } as never)
      .eq("id", user.id);
    if (profErr) {
      return NextResponse.json(
        { error: `profile update failed: ${profErr.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    orderId,
    status: confirmation.status,
    approvedAt: confirmation.approvedAt,
  });
}
