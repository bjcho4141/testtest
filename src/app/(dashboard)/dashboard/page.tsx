import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role = "viewer";
  let subscriptionStatus = "none";
  let paidUntil: string | null = null;
  let recentPayments: {
    order_id: string;
    amount: number;
    status: string;
    approved_at: string | null;
    created_at: string;
  }[] = [];

  if (user) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("role, subscription_status, paid_until")
      .eq("id", user.id)
      .single();
    if (prof) {
      const p = prof as {
        role: string;
        subscription_status: string;
        paid_until: string | null;
      };
      role = p.role;
      subscriptionStatus = p.subscription_status;
      paidUntil = p.paid_until;
    }

    const { data: pays } = await supabase
      .from("payments")
      .select("order_id, amount, status, approved_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (pays) recentPayments = pays as typeof recentPayments;
  }

  const paidUntilLabel = paidUntil
    ? new Date(paidUntil).toLocaleString("ko-KR")
    : "—";

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">대시보드</h1>

      <section className="rounded-md border p-4 space-y-2 text-sm" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-semibold text-base">계정 상태</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          <dt style={{ color: "var(--muted)" }}>이메일</dt>
          <dd className="break-all">{user?.email ?? "—"}</dd>
          <dt style={{ color: "var(--muted)" }}>역할</dt>
          <dd>{role}</dd>
          <dt style={{ color: "var(--muted)" }}>구독 상태</dt>
          <dd>{subscriptionStatus}</dd>
          <dt style={{ color: "var(--muted)" }}>유효 기한</dt>
          <dd>{paidUntilLabel}</dd>
        </dl>
        <div className="pt-2">
          <Link href="/dashboard/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
            결제 화면
          </Link>
        </div>
      </section>

      <section className="rounded-md border p-4 space-y-3 text-sm" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-semibold text-base">최근 결제 (최대 5건)</h2>
        {recentPayments.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>결제 이력 없음</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {recentPayments.map((p) => (
              <li key={p.order_id} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="font-mono text-xs break-all">{p.order_id}</div>
                <div className="flex gap-3 text-xs">
                  <span>{p.amount.toLocaleString("ko-KR")}원</span>
                  <span className={p.status === "DONE" ? "text-green-600" : "text-amber-600"}>
                    {p.status}
                  </span>
                  <span style={{ color: "var(--muted)" }}>
                    {new Date(p.approved_at ?? p.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs" style={{ color: "var(--muted)" }}>
        준비 중 — Phase 3에서 채널·변환·업로드 위젯이 들어옵니다.
      </p>
    </div>
  );
}
