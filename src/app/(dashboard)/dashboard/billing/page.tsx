import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentWidget } from "./_components/payment-widget";
import { SubscriptionWidget } from "./_components/subscription-widget";
import { CancelSubscriptionButton } from "./_components/cancel-subscription-button";

type SearchParams = Promise<{ from?: string; plan?: string }>;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { from, plan } = await searchParams;
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required");

  // 활성 구독 + 빌링키 + paid_until 조회
  const [{ data: sub }, { data: bk }, { data: prof }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id, status, next_charge_at, amount")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("billing_keys")
      .select("card_company, card_last4")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("paid_until, subscription_status, role")
      .eq("id", user.id)
      .single(),
  ]);
  const activeSub = sub as
    | { id: string; status: string; next_charge_at: string; amount: number }
    | null;
  const activeBk = bk as
    | { card_company: string | null; card_last4: string | null }
    | null;
  const profile = prof as
    | { paid_until: string | null; subscription_status: string | null; role: string | null }
    | null;

  const isSuperadmin = profile?.role === "superadmin";
  const paidUntil = profile?.paid_until ? new Date(profile.paid_until) : null;
  const now = new Date();
  const isPaid = isSuperadmin || (paidUntil && paidUntil > now) || profile?.subscription_status === "active";
  const isBlocked = from === "blocked" || from === "rpc_error";
  const showSinglePlanFirst = plan === "single";
  const showSubFirst = plan === "subscription";

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto">
      {/* HERO — 미결제 상태 강조 */}
      {isBlocked && !isPaid && (
        <section className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-6 text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100">
            이용권이 필요합니다
          </h2>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            영상 변환 / 채널 관리 / 분석 등 모든 기능을 사용하려면 결제가 필요합니다
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            아래에서 단건 / 정기결제 중 선택해 주세요
          </p>
        </section>
      )}

      <header className="space-y-1">
        <h1 className="text-3xl font-bold">결제</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {isPaid ? "현재 이용 중인 플랜" : "두 가지 플랜 중 선택해 주세요"}
        </p>
      </header>

      {/* 결제됨 상태 — 현재 이용권 표시 */}
      {isPaid && (
        <section className="rounded-xl border bg-green-50 dark:bg-green-900/20 p-5 space-y-2 text-sm" style={{ borderColor: "rgb(134 239 172)" }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <span className="font-semibold text-green-900 dark:text-green-100">
              {isSuperadmin ? "운영자 영구 이용권" : activeSub ? "월 자동 결제 활성" : "단건 이용권 활성"}
            </span>
          </div>
          {!isSuperadmin && paidUntil && (
            <div className="flex justify-between pt-2">
              <span style={{ color: "var(--muted)" }}>이용 가능 기한</span>
              <span className="font-medium">{paidUntil.toLocaleString("ko-KR")}</span>
            </div>
          )}
        </section>
      )}

      {/* 두 플랜 비교 카드 */}
      {!isPaid && (
        <section className="grid sm:grid-cols-2 gap-4">
          {/* 단건 카드 */}
          <a
            href="?plan=single#single-plan"
            className={`block rounded-xl border-2 p-5 space-y-3 transition hover:border-neutral-900 dark:hover:border-white ${
              showSinglePlanFirst ? "border-neutral-900 dark:border-white" : ""
            }`}
            style={showSinglePlanFirst ? {} : { borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800" style={{ color: "var(--muted)" }}>
                한 달
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>1회 결제</span>
            </div>
            <div>
              <div className="text-3xl font-bold">9,900<span className="text-base font-normal">원</span></div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>30일 사용</div>
            </div>
            <ul className="text-sm space-y-1.5 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <li>✅ 모든 기능 사용</li>
              <li>✅ 영상 무제한 변환</li>
              <li>⏰ 30일 후 자동 만료</li>
              <li className="text-xs" style={{ color: "var(--muted)" }}>가벼운 테스트 / 일회성 사용</li>
            </ul>
            <div className="pt-2 text-sm font-semibold text-blue-600">
              단건 결제 →
            </div>
          </a>

          {/* 정기 카드 */}
          <a
            href="?plan=subscription#sub-plan"
            className={`block rounded-xl border-2 p-5 space-y-3 transition relative hover:border-neutral-900 dark:hover:border-white ${
              showSubFirst ? "border-neutral-900 dark:border-white" : ""
            }`}
            style={showSubFirst ? {} : { borderColor: "var(--border)" }}
          >
            <div className="absolute -top-3 right-4 text-[10px] font-semibold px-2 py-1 rounded bg-neutral-900 text-white dark:bg-white dark:text-black">
              추천
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100">
                월 정기
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>매월 자동</span>
            </div>
            <div>
              <div className="text-3xl font-bold">9,900<span className="text-base font-normal">원</span><span className="text-sm font-normal" style={{ color: "var(--muted)" }}> / 월</span></div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>해지 시까지 자동 갱신</div>
            </div>
            <ul className="text-sm space-y-1.5 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <li>✅ 모든 기능 사용</li>
              <li>✅ 영상 무제한 변환</li>
              <li>🔄 끊김 없이 계속 이용</li>
              <li>↩️ 언제든 해지 가능</li>
              <li className="text-xs" style={{ color: "var(--muted)" }}>꾸준히 영상 만드시는 분</li>
            </ul>
            <div className="pt-2 text-sm font-semibold text-blue-600">
              정기 결제 →
            </div>
          </a>
        </section>
      )}

      {/* 단건 결제 위젯 */}
      <section
        id="single-plan"
        className="space-y-3 scroll-mt-8 rounded-xl border p-5"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-lg">단건 결제 (30일)</h2>
          <span className="text-xs" style={{ color: "var(--muted)" }}>9,900원 · 1회</span>
        </div>
        <PaymentWidget clientKey={clientKey} customerKey={user.id} />
      </section>

      {/* 정기 결제 섹션 */}
      <section
        id="sub-plan"
        className="space-y-3 scroll-mt-8 rounded-xl border p-5"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-lg">정기결제 (월 자동)</h2>
          <span className="text-xs" style={{ color: "var(--muted)" }}>9,900원 / 월 · 해지 시까지</span>
        </div>
        {activeSub ? (
          <div className="rounded-md border p-4 space-y-2 text-sm bg-blue-50 dark:bg-blue-900/10" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔄</span>
              <span className="font-semibold">현재 정기결제 활성</span>
            </div>
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
            <div className="pt-3 border-t" style={{ borderColor: "var(--border)" }}>
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

      {/* FAQ / 안내 */}
      <section className="text-xs space-y-2 rounded-md border p-4" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        <p>
          • <strong>단건 vs 정기</strong>: 단건은 1회 결제 후 30일 자동 만료. 정기는 매월 자동 청구되며 언제든 해지 가능.
        </p>
        <p>
          • <strong>해지</strong>: 정기 결제는 위 "정기결제 해지" 버튼으로 즉시 해지. 남은 기간은 끝까지 사용 가능.
        </p>
        <p>
          • <strong>환불</strong>: 청약철회 7일 이내 가능 (디지털 콘텐츠 사용 시작 시 제한). <a href="/refund" target="_blank" className="underline">환불정책</a>
        </p>
      </section>
    </div>
  );
}
