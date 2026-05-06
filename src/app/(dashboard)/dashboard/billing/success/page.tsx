import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { confirmTossPayment, SUBSCRIPTION_AMOUNT_KRW } from "@/lib/toss";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type SP = Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { paymentKey, orderId, amount } = await searchParams;
  if (!paymentKey || !orderId || !amount) {
    redirect("/dashboard/billing?from=invalid");
  }
  const amountNum = parseInt(amount!, 10);
  if (amountNum !== SUBSCRIPTION_AMOUNT_KRW) {
    redirect("/dashboard/billing?from=amount_mismatch");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required");

  let status: string;
  let approvedAt: string | null = null;
  let confirmError: string | null = null;

  try {
    const result = await confirmTossPayment({
      paymentKey: paymentKey!,
      orderId: orderId!,
      amount: amountNum,
    });
    status = result.status;
    approvedAt = result.approvedAt ?? null;

    const admin = createAdminClient();
    const { error: insErr } = await admin
      .from("payments")
      .insert({
        user_id: user.id,
        payment_key: paymentKey!,
        order_id: orderId!,
        amount: amountNum,
        currency: "KRW",
        status,
        method: result.method ?? null,
        approved_at: approvedAt,
        raw_response: result as never,
      } as never);

    // 23505 = unique_violation (idempotent: 새로고침 시)
    if (insErr && insErr.code !== "23505") {
      throw new Error(`payments insert: ${insErr.message}`);
    }

    if (status === "DONE") {
      const paidUntil = new Date();
      paidUntil.setMonth(paidUntil.getMonth() + 1);
      await admin
        .from("profiles")
        .update({
          paid_until: paidUntil.toISOString(),
          subscription_status: "active",
        } as never)
        .eq("id", user.id);
    }
  } catch (e) {
    status = "FAILED";
    confirmError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">
        {status === "DONE" ? "✅ 결제 완료" : "⚠️ 결제 처리"}
      </h1>
      <dl className="text-sm space-y-1">
        <div>
          <dt className="inline font-medium">주문번호: </dt>
          <dd className="inline">{orderId}</dd>
        </div>
        <div>
          <dt className="inline font-medium">금액: </dt>
          <dd className="inline">{amountNum.toLocaleString("ko-KR")}원</dd>
        </div>
        <div>
          <dt className="inline font-medium">상태: </dt>
          <dd className="inline">{status}</dd>
        </div>
        {approvedAt && (
          <div>
            <dt className="inline font-medium">승인시각: </dt>
            <dd className="inline">{approvedAt}</dd>
          </div>
        )}
      </dl>
      {confirmError && (
        <p className="text-xs text-red-600 break-words">오류: {confirmError}</p>
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
