import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentWidget } from "./_components/payment-widget";
import { SubscriptionWidget } from "./_components/subscription-widget";
import { CancelSubscriptionButton } from "./_components/cancel-subscription-button";

type SearchParams = Promise<{ from?: string }>;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { from } = await searchParams;
  const clientKey = process.env.TOSS_CLIENT_KEY;
  if (!clientKey) {
    return (
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-2xl font-bold">결제</h1>
        <p className="text-sm text-red-600">
          TOSS_CLIENT_KEY 미설정. .env.local 또는 Vercel env 확인.
        </p>
      </div>
    );
  }

  // 인증된 사용자 ID = customerKey (토스 정기결제용 식별자)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required");

  // 활성 구독 + 빌링키 조회
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, status, next_charge_at, amount")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const { data: bk } = await supabase
    .from("billing_keys")
    .select("card_company, card_last4")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const activeSub = sub as
    | { id: string; status: string; next_charge_at: string; amount: number }
    | null;
  const activeBk = bk as
    | { card_company: string | null; card_last4: string | null }
    | null;

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">결제</h1>

      {from === "blocked" && (
        <div className="text-sm rounded-md px-4 py-2 border border-amber-300 bg-amber-50 text-amber-900">
          유료 구독이 필요한 페이지입니다. 결제 후 이용해 주세요.
        </div>
      )}
      {from === "rpc_error" && (
        <div className="text-sm rounded-md px-4 py-2 border border-red-300 bg-red-50 text-red-900">
          결제 상태 확인 실패. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">단건 결제 (30일)</h2>
        <PaymentWidget clientKey={clientKey} customerKey={user.id} />
      </section>

      <section className="space-y-3 border-t pt-6" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-semibold text-lg">정기결제 (월 자동)</h2>
        {activeSub ? (
          <div className="rounded-md border p-4 space-y-2 text-sm" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between">
              <span style={{ color: "var(--muted)" }}>등록 카드</span>
              <span>
                {activeBk?.card_company ?? "—"}
                {activeBk?.card_last4 ? ` ****-${activeBk.card_last4}` : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--muted)" }}>다음 청구일</span>
              <span>{new Date(activeSub.next_charge_at).toLocaleDateString("ko-KR")}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--muted)" }}>금액</span>
              <span>{activeSub.amount.toLocaleString("ko-KR")}원 / 월</span>
            </div>
            <div className="pt-2">
              <CancelSubscriptionButton />
            </div>
          </div>
        ) : (
          <SubscriptionWidget
            clientKey={clientKey}
            customerKey={user.id}
            customerEmail={user.email ?? null}
          />
        )}
      </section>
    </div>
  );
}
