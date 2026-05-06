/**
 * 토스 빌링키 발급 + 구독 시작 (PRD §16.3)
 *
 * 흐름:
 *   1. 인증 + customerKey == auth.uid() 검증
 *   2. 토스 /v1/billing/authorizations/issue → billingKey
 *   3. AES-256-GCM 암호화 후 billing_keys INSERT
 *   4. subscriptions INSERT (active, next_charge_at = now+30d)
 *   5. profiles.active_subscription_id = subscriptions.id
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { issueTossBillingKey, SUBSCRIPTION_AMOUNT_KRW } from "@/lib/toss";
import { encrypt } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  let body: { authKey?: string; customerKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { authKey, customerKey } = body;
  if (!authKey || !customerKey) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (customerKey !== user.id) {
    return NextResponse.json({ error: "customerKey mismatch" }, { status: 403 });
  }

  let tossResp: Awaited<ReturnType<typeof issueTossBillingKey>>;
  try {
    tossResp = await issueTossBillingKey({ authKey, customerKey });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const admin = createAdminClient();

  // 기존 active 빌링키 revoke (1유저 1빌링키 정책)
  await admin
    .from("billing_keys")
    .update({ status: "revoked", revoked_at: new Date().toISOString() } as never)
    .eq("user_id", user.id)
    .eq("status", "active");

  const encrypted = encrypt(tossResp.billingKey);
  const cardCompany = tossResp.card?.company ?? tossResp.cardCompany ?? null;
  const cardLast4 = (tossResp.card?.number ?? tossResp.cardNumber ?? "")
    .toString()
    .replace(/[^0-9]/g, "")
    .slice(-4) || null;

  const { data: bkRow, error: bkErr } = await admin
    .from("billing_keys")
    .insert({
      user_id: user.id,
      customer_key: customerKey,
      billing_key_encrypted: encrypted as never,
      card_company: cardCompany,
      card_last4: cardLast4,
      status: "active",
    } as never)
    .select("id")
    .single();
  if (bkErr || !bkRow) {
    return NextResponse.json(
      { error: `billing_keys insert: ${bkErr?.message ?? "no row"}` },
      { status: 500 },
    );
  }
  const billingKeyId = (bkRow as { id: string }).id;

  // 기존 active 구독 만료 처리
  await admin
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() } as never)
    .eq("user_id", user.id)
    .eq("status", "active");

  const next = new Date();
  next.setDate(next.getDate() + 30);
  const { data: subRow, error: subErr } = await admin
    .from("subscriptions")
    .insert({
      user_id: user.id,
      billing_key_id: billingKeyId,
      plan: "standard",
      amount: SUBSCRIPTION_AMOUNT_KRW,
      status: "active",
      next_charge_at: next.toISOString(),
    } as never)
    .select("id")
    .single();
  if (subErr || !subRow) {
    return NextResponse.json(
      { error: `subscriptions insert: ${subErr?.message ?? "no row"}` },
      { status: 500 },
    );
  }

  await admin
    .from("profiles")
    .update({
      active_subscription_id: (subRow as { id: string }).id,
      subscription_status: "active",
    } as never)
    .eq("id", user.id);

  return NextResponse.json({ ok: true, billingKeyId, subscriptionId: (subRow as { id: string }).id });
}
