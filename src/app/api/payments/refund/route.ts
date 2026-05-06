/**
 * 결제 취소/환불 (PRD §16.5)
 *
 * 흐름:
 *   1. 인증 + 본인 결제만 환불 가능 (RLS payments select)
 *   2. 토스 cancel API 호출 (Idempotency-Key=paymentKey:cancel)
 *   3. refunds INSERT + payments UPDATE
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const TOSS_API = "https://api.tosspayments.com";

export async function POST(request: NextRequest) {
  let body: { paymentKey?: string; cancelReason?: string; cancelAmount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { paymentKey, cancelReason, cancelAmount } = body;
  if (!paymentKey || !cancelReason) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 본인 결제 확인
  const { data: pay, error: payErr } = await supabase
    .from("payments")
    .select("id, user_id, amount, status")
    .eq("payment_key", paymentKey)
    .single();

  if (payErr || !pay) {
    return NextResponse.json({ error: "payment not found" }, { status: 404 });
  }
  type PayRow = { id: string; user_id: string; amount: number; status: string };
  const p = pay as PayRow;
  if (p.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (p.status !== "DONE") {
    return NextResponse.json({ error: "not refundable" }, { status: 400 });
  }

  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "TOSS_SECRET_KEY missing" }, { status: 500 });
  }
  const auth = Buffer.from(`${secret}:`).toString("base64");

  const cancelBody: Record<string, unknown> = { cancelReason };
  if (typeof cancelAmount === "number") cancelBody.cancelAmount = cancelAmount;

  const res = await fetch(`${TOSS_API}/v1/payments/${paymentKey}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `${paymentKey}:cancel`,
    },
    body: JSON.stringify(cancelBody),
  });
  const rawResp = (await res.json()) as { code?: string; message?: string };
  if (!res.ok) {
    return NextResponse.json(
      { error: `toss cancel: ${rawResp.code ?? "?"} ${rawResp.message ?? ""}` },
      { status: 502 },
    );
  }

  const admin = createAdminClient();
  await admin.from("refunds").insert({
    payment_id: p.id,
    cancel_reason: cancelReason,
    cancel_amount: cancelAmount ?? p.amount,
    status: "done",
    raw_response: rawResp as never,
    canceled_at: new Date().toISOString(),
  } as never);

  // 전액 환불 시 결제 상태도 업데이트
  if (!cancelAmount || cancelAmount === p.amount) {
    await admin
      .from("payments")
      .update({ status: "CANCELED" } as never)
      .eq("id", p.id);
  }

  return NextResponse.json({ ok: true });
}
