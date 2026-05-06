import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewPairForm } from "./_components/new-pair-form";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { ko: string; cls: string }> = {
  pending: { ko: "대기", cls: "bg-neutral-100 text-neutral-700" },
  queued: { ko: "큐 적재", cls: "bg-blue-50 text-blue-700" },
  processing: { ko: "변환 중", cls: "bg-blue-100 text-blue-800" },
  review: { ko: "검수", cls: "bg-amber-50 text-amber-800" },
  uploaded: { ko: "업로드됨", cls: "bg-green-50 text-green-700" },
  published: { ko: "공개됨", cls: "bg-green-100 text-green-800" },
  failed: { ko: "실패", cls: "bg-red-50 text-red-700" },
};

type PairRow = {
  id: string;
  channel_id: string;
  korean_url: string;
  original_url: string | null;
  license_source: string;
  status: string;
  transformation_count: number;
  created_at: string;
  channels: { slug: string; name: string } | null;
};

export default async function PairsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required");

  const [{ data: channels }, { data: pairs }] = await Promise.all([
    supabase
      .from("channels")
      .select("id, name, slug")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("shorts_pairs")
      .select(
        "id, channel_id, korean_url, original_url, license_source, status, transformation_count, created_at, channels(slug, name)",
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const channelList = (channels ?? []) as { id: string; name: string; slug: string }[];
  const pairList = (pairs ?? []) as PairRow[];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">영상 페어</h1>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          총 {pairList.length}개
        </span>
      </div>

      <NewPairForm channels={channelList} />

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">최근 페어 (최대 100건)</h2>
        {pairList.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            아직 등록된 영상 페어가 없습니다.
          </p>
        ) : (
          <ul className="divide-y rounded-md border" style={{ borderColor: "var(--border)" }}>
            {pairList.map((p) => {
              const st = STATUS_LABEL[p.status] ?? {
                ko: p.status,
                cls: "bg-neutral-100",
              };
              return (
                <li key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <Link
                    href={`/dashboard/pairs/${p.id}`}
                    className="block p-3 flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs rounded px-2 py-0.5 ${st.cls}`}>
                        {st.ko}
                      </span>
                      <span className="text-xs uppercase" style={{ color: "var(--muted)" }}>
                        {p.license_source}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {p.channels?.name ?? p.channel_id.slice(0, 8)}
                      </span>
                      <span className="text-xs ml-auto" style={{ color: "var(--muted)" }}>
                        {new Date(p.created_at).toLocaleDateString("ko-KR")}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>→</span>
                    </div>
                    <span className="text-xs font-mono truncate underline">
                      {p.korean_url}
                    </span>
                    {p.original_url && (
                      <span
                        className="text-xs font-mono truncate"
                        style={{ color: "var(--muted)" }}
                      >
                        원본: {p.original_url}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
