import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAIR_STATUS_BUCKETS = [
  "pending",
  "queued",
  "processing",
  "review",
  "uploaded",
  "published",
  "failed",
] as const;

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required");

  // RLS 가 본인 데이터만 노출
  const [{ data: pairs }, { data: payments }, { data: cost }] = await Promise.all([
    supabase.from("shorts_pairs").select("status, transformation_count, created_at"),
    supabase.from("payments").select("amount, status, created_at"),
    supabase.from("cost_ledger").select("service, krw, usd"),
  ]);

  type PairRow = { status: string; transformation_count: number; created_at: string };
  type PayRow = { amount: number; status: string; created_at: string };
  type CostRow = { service: string; krw: number | null; usd: number | null };
  const pairList = (pairs ?? []) as PairRow[];
  const payList = (payments ?? []) as PayRow[];
  const costList = (cost ?? []) as CostRow[];

  const pairCounts: Record<string, number> = {};
  for (const s of PAIR_STATUS_BUCKETS) pairCounts[s] = 0;
  for (const p of pairList) pairCounts[p.status] = (pairCounts[p.status] ?? 0) + 1;

  const totalRevenue = payList
    .filter((p) => p.status === "DONE")
    .reduce((s, p) => s + p.amount, 0);
  const totalPays = payList.length;

  const costByService: Record<string, number> = {};
  for (const c of costList) {
    const krw = c.krw ?? (c.usd ? c.usd * 1300 : 0);
    costByService[c.service] = (costByService[c.service] ?? 0) + Number(krw);
  }
  const totalCost = Object.values(costByService).reduce((a, b) => a + b, 0);

  const passed =
    (pairCounts.uploaded ?? 0) + (pairCounts.published ?? 0);
  const finished = passed + (pairCounts.failed ?? 0);
  const passRate = finished > 0 ? Math.round((passed / finished) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">분석</h1>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="페어 합격률" value={`${passRate}%`} sub={`${passed} / ${finished}`} />
        <Stat label="누적 결제" value={`${totalRevenue.toLocaleString("ko-KR")}원`} sub={`${totalPays}건`} />
        <Stat label="누적 변환 비용" value={`${Math.round(totalCost).toLocaleString("ko-KR")}원`} sub={`${costList.length} 항목`} />
        <Stat label="MAS (영상당 비용)" value={passed ? `${Math.round(totalCost / passed).toLocaleString("ko-KR")}원` : "—"} sub="합격 1편당" />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">페어 상태 분포</h2>
        <ul className="rounded-md border divide-y" style={{ borderColor: "var(--border)" }}>
          {PAIR_STATUS_BUCKETS.map((s) => (
            <li key={s} className="p-2 flex items-center justify-between text-sm">
              <span>{s}</span>
              <span className="font-mono">{pairCounts[s] ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">서비스별 비용 (KRW)</h2>
        {Object.keys(costByService).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            비용 기록 없음
          </p>
        ) : (
          <ul className="rounded-md border divide-y" style={{ borderColor: "var(--border)" }}>
            {Object.entries(costByService)
              .sort((a, b) => b[1] - a[1])
              .map(([s, v]) => (
                <li key={s} className="p-2 flex items-center justify-between text-sm">
                  <span>{s}</span>
                  <span className="font-mono">{Math.round(v).toLocaleString("ko-KR")}</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
      <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
      {sub && (
        <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
