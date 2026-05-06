import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { OutputPlayer } from "./_components/output-player";
import { AutoRefresh } from "./_components/auto-refresh";
import { RetryButton } from "./_components/retry-button";
import { ReviewActions } from "./_components/review-actions";
import { MetaEditor } from "./_components/meta-editor";
import { DeleteButton } from "./_components/delete-button";
import { StageList, type StageJob } from "./_components/stage-list";
import { VoicePicker } from "./_components/voice-picker";

export const dynamic = "force-dynamic";

export default async function PairDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required");

  const { data: pair } = await supabase
    .from("shorts_pairs")
    .select(
      "id, channel_id, korean_url, original_url, license_source, license_evidence_url, status, transformation_count, original_meta, created_at, channels(slug, name, owner_id)",
    )
    .eq("id", id)
    .single();

  if (!pair) notFound();
  type ChannelMini = { slug: string; name: string; owner_id: string };
  type PairFull = {
    id: string;
    channel_id: string;
    korean_url: string;
    original_url: string | null;
    license_source: string;
    license_evidence_url: string;
    status: string;
    transformation_count: number;
    original_meta: Record<string, unknown> | null;
    created_at: string;
    channels: ChannelMini | null;
  };
  const p = pair as PairFull;
  const resultMeta = (p.original_meta?.result ?? null) as
    | { title?: string; description?: string; tags?: string[] }
    | null;
  const voiceMeta = (p.original_meta?.voice ?? null) as
    | { voice_id?: string; model_id?: string }
    | null;
  if (p.channels && p.channels.owner_id !== user.id) notFound();

  const { data: jobs } = await supabase
    .from("conversion_jobs")
    .select("id, stage, status, attempt, started_at, finished_at, error_message")
    .eq("pair_id", id)
    .order("started_at", { ascending: true });
  const jobList = (jobs ?? []) as StageJob[];

  const { data: logs } = await supabase
    .from("agent_logs")
    .select("id, from_actor, to_actor, type, message, step, created_at")
    .eq("pair_id", id)
    .order("created_at", { ascending: false })
    .limit(30);
  type LogRow = {
    id: number;
    from_actor: string;
    to_actor: string;
    type: string;
    message: string;
    step: number | null;
    created_at: string;
  };
  const logList = (logs ?? []) as LogRow[];

  return (
    <div className="space-y-6 max-w-4xl">
      <AutoRefresh status={p.status} />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">영상 페어</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/pairs" className={buttonVariants({ variant: "outline", size: "sm" })}>
            ← 목록
          </Link>
          <DeleteButton pairId={p.id} />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-sm">결과 영상</h2>
          <RetryButton pairId={p.id} status={p.status} />
        </div>
        <OutputPlayer pairId={p.id} status={p.status} />
        <ReviewActions pairId={p.id} status={p.status} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">업로드 메타</h2>
        <MetaEditor pairId={p.id} initial={resultMeta} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">변환 옵션</h2>
        <VoicePicker pairId={p.id} initial={voiceMeta} />
      </section>

      <section className="rounded-md border p-4 space-y-2 text-sm" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-semibold">기본 정보</h2>
        <dl className="grid grid-cols-[120px_1fr] gap-y-1">
          <dt style={{ color: "var(--muted)" }}>채널</dt>
          <dd>{p.channels?.name ?? p.channel_id.slice(0, 8)}</dd>
          <dt style={{ color: "var(--muted)" }}>상태</dt>
          <dd>{p.status}</dd>
          <dt style={{ color: "var(--muted)" }}>한국 숏츠</dt>
          <dd className="break-all">
            <a href={p.korean_url} target="_blank" rel="noopener noreferrer" className="underline">
              {p.korean_url}
            </a>
          </dd>
          <dt style={{ color: "var(--muted)" }}>원본</dt>
          <dd className="break-all">
            {p.original_url ? (
              <a href={p.original_url} target="_blank" rel="noopener noreferrer" className="underline">
                {p.original_url}
              </a>
            ) : (
              "—"
            )}
          </dd>
          <dt style={{ color: "var(--muted)" }}>라이선스</dt>
          <dd>{p.license_source}</dd>
          <dt style={{ color: "var(--muted)" }}>증거 URL</dt>
          <dd className="break-all">
            <a
              href={p.license_evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-xs"
            >
              {p.license_evidence_url}
            </a>
          </dd>
          <dt style={{ color: "var(--muted)" }}>변형 카운트</dt>
          <dd>{p.transformation_count} / 6 (분석 단계 완료 시 ≥6 강제)</dd>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">변환 단계</h2>
        <StageList jobs={jobList} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">에이전트 로그 (최근 30건)</h2>
        {logList.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            로그 없음
          </p>
        ) : (
          <ul className="rounded-md border divide-y text-xs font-mono" style={{ borderColor: "var(--border)" }}>
            {logList.map((l) => (
              <li key={l.id} className="p-2 flex flex-col sm:flex-row sm:items-center gap-1">
                <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                  {new Date(l.created_at).toLocaleTimeString("ko-KR")}
                </span>
                <span className="font-semibold">{l.from_actor}</span>
                <span style={{ color: "var(--muted)" }}>→</span>
                <span>{l.to_actor}</span>
                <span className="text-[10px] uppercase rounded px-1" style={{ color: "var(--muted)" }}>
                  {l.type}
                </span>
                <span className="basis-full sm:basis-auto sm:flex-1 break-all">{l.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
