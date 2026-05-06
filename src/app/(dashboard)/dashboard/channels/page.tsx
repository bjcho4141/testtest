import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewChannelForm } from "./_components/new-channel-form";

export const dynamic = "force-dynamic";

type ChannelRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  upload_paused: boolean;
  created_at: string;
};

export default async function ChannelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=required");

  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, slug, description, upload_paused, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const list = (channels ?? []) as ChannelRow[];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">채널</h1>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          총 {list.length}개
        </span>
      </div>

      <NewChannelForm />

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">내 채널</h2>
        {list.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            아직 등록된 채널이 없습니다. 위 폼에서 첫 채널을 등록하세요.
          </p>
        ) : (
          <ul className="divide-y rounded-md border" style={{ borderColor: "var(--border)" }}>
            {list.map((c) => (
              <li key={c.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{c.name}</div>
                  <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                    {c.slug}
                  </div>
                  {c.description && (
                    <div className="text-xs mt-1 line-clamp-2" style={{ color: "var(--muted)" }}>
                      {c.description}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-center text-xs">
                  {c.upload_paused && (
                    <span className="rounded px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200">
                      업로드 일시정지
                    </span>
                  )}
                  <span style={{ color: "var(--muted)" }}>
                    {new Date(c.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
