/**
 * 정기결제 자동 청구 cron (PRD §16.3)
 *
 * 매일 00:00 KST (15:00 UTC) — vercel.json crons "0 15 * * *"
 * Vercel Cron: header `authorization: Bearer ${CRON_SECRET}` 자동 첨부
 *
 * 흐름:
 *   1. subscriptions where status='active' AND next_charge_at <= now()
 *   2. 빌링키 복호화 → 토스 charge
 *   3. 성공 → payments INSERT + paid_until +30d + next_charge_at +30d + last_charged_at + failure_count=0
 *   4. 실패 → failure_count++ (3회 → past_due, paid_until 후 7일 → expired)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { chargeWithBillingKey, SUBSCRIPTION_AMOUNT_KRW, SUBSCRIPTION_NAME } from "@/lib/toss";
import { decrypt } from "@/lib/crypto";

type SubRow = {
  id: string;
  user_id: string;
  billing_key_id: string | null;
  amount: number;
  failure_count: number;
  next_charge_at: string;
};

type BkRow = {
  id: string;
  customer_key: string;
  billing_key_encrypted: string; // bytea hex
  status: string;
};

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 개발: 미설정 시 통과
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: subs, error: subErr } = await admin
    .from("subscriptions")
    .select("id, user_id, billing_key_id, amount, failure_count, next_charge_at")
    .eq("status", "active")
    .lte("next_charge_at", now.toISOString())
    .limit(100);
  if (subErr) {
    return NextResponse.json({ error: `query subs: ${subErr.message}` }, { status: 500 });
  }

  const results: Array<{ subId: string; ok: boolean; reason?: string }> = [];
  const list = (subs ?? []) as SubRow[];

  for (const sub of list) {
    if (!sub.billing_key_id) {
      results.push({ subId: sub.id, ok: false, reason: "no billing_key_id" });
      continue;
    }
    const { data: bk } = await admin
      .from("billing_keys")
      .select("id, customer_key, billing_key_encrypted, status")
      .eq("id", sub.billing_key_id)
      .single();
    const bkRow = bk as BkRow | null;
    if (!bkRow || bkRow.status !== "active") {
      results.push({ subId: sub.id, ok: false, reason: "billing_key revoked" });
      continue;
    }

    let billingKeyPlain: string;
    try {
      const blob = Buffer.isBuffer(bkRow.billing_key_encrypted)
        ? (bkRow.billing_key_encrypted as unknown as Buffer)
        : Buffer.from(
            (bkRow.billing_key_encrypted as string).replace(/^\\x/, ""),
            "hex",
          );
      billingKeyPlain = decrypt(blob);
    } catch (e) {
      results.push({
        subId: sub.id,
        ok: false,
        reason: `decrypt: ${e instanceof Error ? e.message : String(e)}`,
      });
      continue;
    }

    const orderId = `sub_${sub.id.slice(0, 8)}_${Date.now()}`;
    try {
      const charge = await chargeWithBillingKey({
        billingKey: billingKeyPlain,
        customerKey: bkRow.customer_key,
        orderId,
        amount: sub.amount || SUBSCRIPTION_AMOUNT_KRW,
        orderName: SUBSCRIPTION_NAME,
      });

      await admin.from("payments").insert({
        user_id: sub.user_id,
        payment_key: charge.paymentKey,
        order_id: orderId,
        amount: sub.amount || SUBSCRIPTION_AMOUNT_KRW,
        currency: "KRW",
        status: charge.status,
        method: charge.method ?? "card",
        approved_at: charge.approvedAt ?? null,
        raw_response: charge as never,
      } as never);

      const next = new Date();
      next.setDate(next.getDate() + 30);
      const paidUntil = new Date();
      paidUntil.setDate(paidUntil.getDate() + 30);

      await admin
        .from("subscriptions")
        .update({
          last_charged_at: new Date().toISOString(),
          next_charge_at: next.toISOString(),
          failure_count: 0,
        } as never)
        .eq("id", sub.id);

      await admin
        .from("profiles")
        .update({
          paid_until: paidUntil.toISOString(),
          subscription_status: "active",
        } as never)
        .eq("id", sub.user_id);

      results.push({ subId: sub.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const newCount = (sub.failure_count ?? 0) + 1;

      // 3회 실패 → past_due, paid_until + 7일 후 expired (다음 cron 실행 시점에 expired 처리)
      const newStatus = newCount >= 3 ? "past_due" : "active";
      // past_due 일 때 next_charge_at 은 24시간 후 재시도
      const retry = new Date();
      retry.setHours(retry.getHours() + 24);

      await admin
        .from("subscriptions")
        .update({
          failure_count: newCount,
          status: newStatus,
          next_charge_at: retry.toISOString(),
        } as never)
        .eq("id", sub.id);

      if (newStatus === "past_due") {
        await admin
          .from("profiles")
          .update({ subscription_status: "past_due" } as never)
          .eq("id", sub.user_id);
      }

      results.push({ subId: sub.id, ok: false, reason: msg });
    }
  }

  // expired 전이: paid_until + 7일 < now 인 past_due 구독
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: expiredCandidates } = await admin
    .from("subscriptions")
    .select("id, user_id")
    .eq("status", "past_due");
  for (const row of (expiredCandidates ?? []) as Array<{ id: string; user_id: string }>) {
    const { data: prof } = await admin
      .from("profiles")
      .select("paid_until")
      .eq("id", row.user_id)
      .single();
    const paidUntil = (prof as { paid_until: string | null } | null)?.paid_until;
    if (paidUntil && new Date(paidUntil) < sevenDaysAgo) {
      await admin
        .from("subscriptions")
        .update({
          status: "expired",
          expires_at: new Date().toISOString(),
        } as never)
        .eq("id", row.id);
      await admin
        .from("profiles")
        .update({ subscription_status: "expired" } as never)
        .eq("id", row.user_id);
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
