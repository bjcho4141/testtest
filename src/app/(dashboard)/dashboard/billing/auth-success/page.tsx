import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { issueTossBillingKey } from "@/lib/toss";
import { encrypt } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/server";

type SP = Promise<{ authKey?: string; customerKey?: string }>;

export const dynamic = "force-dynamic";

export default async function BillingAuthSuccessPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { authKey, customerKey } = await searchParams;
  if (!authKey || !customerKey) {
    redirect("/dashboard/billing?from=invalid");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required");
  if (customerKey !== user.id) {
    redirect("/dashboard/billing?from=customer_mismatch");
  }

  let cardLabel = "카드";
  let errorMsg: string | null = null;

  try {
    const tossResp = await issueTossBillingKey({
      authKey: authKey!,
      customerKey: customerKey!,
    });

    const admin = createAdminClient();
    const now = new Date().toISOString();

    await admin
      .from("billing_keys")
      .update({ status: "revoked", revoked_at: now } as never)
      .eq("user_id", user.id)
      .eq("status", "active");

    const encrypted = encrypt(tossResp.billingKey);
    const cardCompany = tossResp.card?.company ?? tossResp.cardCompany ?? null;
    const cardLast4 =
      (tossResp.card?.number ?? tossResp.cardNumber ?? "")
        .toString()
        .replace(/[^0-9]/g, "")
        .slice(-4) || null;
    cardLabel = `${cardCompany ?? "카드"}${cardLast4 ? ` ****-${cardLast4}` : ""}`;

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
    if (bkErr || !bkRow) throw new Error(`billing_keys: ${bkErr?.message ?? "no row"}`);
    const billingKeyId = (bkRow as { id: string }).id;

    await admin
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: now } as never)
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
        amount: 9900,
        status: "active",
        next_charge_at: next.toISOString(),
      } as never)
      .select("id")
      .single();
    if (subErr || !subRow) throw new Error(`subscriptions: ${subErr?.message ?? "no row"}`);

    await admin
      .from("profiles")
      .update({
        active_subscription_id: (subRow as { id: string }).id,
        subscription_status: "active",
      } as never)
      .eq("id", user.id);
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">
        {errorMsg ? "⚠️ 구독 등록 실패" : "✅ 정기결제 등록 완료"}
      </h1>
      {errorMsg ? (
        <p className="text-xs text-red-600 break-words">{errorMsg}</p>
      ) : (
        <dl className="text-sm space-y-1">
          <div>
            <dt className="inline font-medium">등록 카드: </dt>
            <dd className="inline">{cardLabel}</dd>
          </div>
          <div>
            <dt className="inline font-medium">다음 청구일: </dt>
            <dd className="inline">
              {new Date(Date.now() + 30 * 86400000).toLocaleDateString("ko-KR")}
            </dd>
          </div>
        </dl>
      )}
      <div className="flex gap-2 pt-2">
        <Link href="/dashboard" className={buttonVariants()}>
          대시보드로
        </Link>
        <Link
          href="/dashboard/billing"
          className={buttonVariants({ variant: "outline" })}
        >
          결제 화면
        </Link>
      </div>
    </div>
  );
}
