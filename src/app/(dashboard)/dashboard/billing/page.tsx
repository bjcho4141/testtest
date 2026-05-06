import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentWidget } from "./_components/payment-widget";

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

  return (
    <div className="space-y-4 max-w-2xl">
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

      <PaymentWidget clientKey={clientKey} customerKey={user.id} />
    </div>
  );
}
