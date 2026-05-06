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
  let channelCount = 0;
  let pairCount = 0;
  let pairsByStatus: Record<string, number> = {};

  if (user) {
    const [profRes, paysRes, chRes, prsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("role, subscription_status, paid_until")
        .eq("id", user.id)
        .single(),
      supabase
        .from("payments")
        .select("order_id, amount, status, approved_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("channels").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
      supabase.from("shorts_pairs").select("status"),
    ]);
    const prof = profRes.data as { role: string; subscription_status: string; paid_until: string | null } | null;
    if (prof) {
      role = prof.role;
      subscriptionStatus = prof.subscription_status;
      paidUntil = prof.paid_until;
    }
    const pays = paysRes.data as typeof recentPayments | null;
    if (pays) recentPayments = pays;
    channelCount = chRes.count ?? 0;
    const prs = prsRes.data as Array<{ status: string }> | null;
    if (prs) {
      pairCount = prs.length;
      for (const r of prs) {
        pairsByStatus[r.status] = (pairsByStatus[r.status] ?? 0) + 1;
      }
    }
  }

  const isSuperadmin = role === "superadmin";
  const paid = paidUntil ? new Date(paidUntil) : null;
  const now = new Date();
  const isPaid = isSuperadmin || (paid && paid > now) || subscriptionStatus === "active";
  const reviewing = pairsByStatus.review ?? 0;
  const processing = (pairsByStatus.processing ?? 0) + (pairsByStatus.queued ?? 0) + (pairsByStatus.pending ?? 0);
  const uploaded = (pairsByStatus.uploaded ?? 0) + (pairsByStatus.published ?? 0);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* HERO — 미결제 시 결제 유도 */}
      {!isPaid && (
        <section className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 sm:p-8 space-y-3">
          <div className="text-4xl">👋</div>
          <h2 className="text-2xl font-bold">{user?.email?.split("@")[0]}님, 환영합니다</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            영상 변환 / 채널 관리 / 분석 등 모든 기능을 사용하려면 이용권이 필요합니다.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/dashboard/billing?from=blocked" className={buttonVariants({ size: "lg" })}>
              💳 이용권 결제하기
            </Link>
            <Link href="/dashboard/billing?plan=subscription" className={buttonVariants({ variant: "outline", size: "lg" })}>
              🔄 월 정기결제 보기
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pt-4 text-sm">
            <div className="rounded-md bg-white/60 dark:bg-black/20 p-3 border" style={{ borderColor: "var(--border)" }}>
              <div className="font-semibold mb-1">한 달 단건</div>
              <div className="text-2xl font-bold">9,900원</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>30일 / 1회 결제</div>
            </div>
            <div className="rounded-md bg-white/60 dark:bg-black/20 p-3 border" style={{ borderColor: "var(--border)" }}>
              <div className="font-semibold mb-1">월 정기결제</div>
              <div className="text-2xl font-bold">9,900원 / 월</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>해지 시까지 자동</div>
            </div>
          </div>
        </section>
      )}

      {/* 결제됨 — 환영 + 다음 액션 */}
      {isPaid && (
        <section className="space-y-1">
          <h1 className="text-3xl font-bold">대시보드</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {user?.email} ·{" "}
            {isSuperadmin ? (
              <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-900">슈퍼어드민</span>
            ) : subscriptionStatus === "active" ? (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-900">정기결제</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-900">단건 이용권</span>
            )}
          </p>
        </section>
      )}

      {/* 통계 카드 그리드 */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="채널" value={channelCount} href="/dashboard/channels" icon="📺" cta={channelCount === 0 ? "만들기" : "관리"} />
        <StatCard label="영상 페어" value={pairCount} href="/dashboard/pairs" icon="🎬" cta="등록" />
        <StatCard label="검수 대기" value={reviewing} href="/dashboard/pairs" icon="🔍" highlight={reviewing > 0} />
        <StatCard label="진행 중" value={processing} href="/dashboard/pairs" icon="⚙️" highlight={processing > 0} />
      </section>

      {/* 다음 액션 */}
      {isPaid && (
        <section className="grid sm:grid-cols-2 gap-3">
          {channelCount === 0 ? (
            <ActionCard
              icon="📺"
              title="첫 채널 만들기"
              desc="일본 YouTube 채널 정보 등록"
              href="/dashboard/channels"
              primary
            />
          ) : (
            <ActionCard
              icon="🎬"
              title="새 영상 변환"
              desc="한국 숏츠 + 원본 URL 등록"
              href="/dashboard/pairs"
              primary
            />
          )}
          <ActionCard
            icon="📊"
            title="분석 보기"
            desc="합격률 · 결제 · 비용 KPI"
            href="/dashboard/analytics"
          />
          {reviewing > 0 && (
            <ActionCard
              icon="🔔"
              title={`검수 대기 ${reviewing}편`}
              desc="결과 영상 확인 + 다운로드"
              href="/dashboard/pairs"
              highlight
            />
          )}
          <ActionCard
            icon="💳"
            title="결제 / 구독 관리"
            desc={subscriptionStatus === "active" ? "정기결제 카드 / 해지" : "단건 추가 / 정기 전환"}
            href="/dashboard/billing"
          />
        </section>
      )}

      {/* 최근 결제 */}
      {recentPayments.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-sm">최근 결제 (5건)</h2>
          <ul className="rounded-md border divide-y bg-white dark:bg-neutral-900" style={{ borderColor: "var(--border)" }}>
            {recentPayments.map((p) => (
              <li key={p.order_id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="font-mono text-xs break-all">{p.order_id}</div>
                <div className="flex gap-3 text-xs">
                  <span className="font-semibold">{p.amount.toLocaleString("ko-KR")}원</span>
                  <span className={p.status === "DONE" ? "text-green-600" : "text-amber-600"}>{p.status}</span>
                  <span style={{ color: "var(--muted)" }}>
                    {new Date(p.approved_at ?? p.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 통계 — 변환 결과 분포 */}
      {uploaded > 0 && (
        <section className="rounded-md border p-4 text-sm" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-semibold mb-2">실적</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl font-bold">{uploaded}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>업로드 완료</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{reviewing}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>검수 대기</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{pairsByStatus.failed ?? 0}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>실패</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  icon,
  cta,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  icon: string;
  cta?: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition ${
        highlight ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" : ""
      }`}
      style={highlight ? {} : { borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {cta && (
        <div className="text-[10px] mt-1 underline" style={{ color: "var(--muted)" }}>
          {cta} →
        </div>
      )}
    </Link>
  );
}

function ActionCard({
  icon,
  title,
  desc,
  href,
  primary,
  highlight,
}: {
  icon: string;
  title: string;
  desc: string;
  href: string;
  primary?: boolean;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition ${
        primary
          ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900"
          : highlight
            ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20"
            : ""
      }`}
      style={primary || highlight ? {} : { borderColor: "var(--border)" }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{title}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{desc}</div>
        </div>
        <span style={{ color: "var(--muted)" }}>→</span>
      </div>
    </Link>
  );
}
