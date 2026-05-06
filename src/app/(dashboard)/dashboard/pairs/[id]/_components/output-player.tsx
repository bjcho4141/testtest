"use client";

import { useEffect, useState } from "react";

const READY_STATUSES = new Set(["review", "uploaded", "published"]);

export function OutputPlayer({ pairId, status }: { pairId: string; status: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ready = READY_STATUSES.has(status);

  useEffect(() => {
    if (!ready) return;
    let canceled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/pairs/${pairId}/output`);
        const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
        if (canceled) return;
        if (!res.ok || !data.url) throw new Error(data.error ?? "URL 발급 실패");
        setUrl(data.url);
      } catch (e) {
        if (!canceled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [pairId, ready]);

  if (!ready) {
    return (
      <div
        className="rounded-md border p-4 text-sm bg-neutral-50 dark:bg-neutral-900"
        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
      >
        변환 진행 중 — 완료되면 영상이 여기 표시됩니다 (status: <code>{status}</code>)
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm" style={{ color: "var(--muted)" }}>영상 로딩 중…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600 break-words">⚠️ {error}</p>;
  }
  if (!url) return null;

  return (
    <div className="space-y-2">
      <video
        src={url}
        controls
        playsInline
        className="w-full max-w-md mx-auto rounded-md bg-black"
        style={{ aspectRatio: "9 / 16" }}
      />
      <div className="flex flex-wrap gap-2 text-sm">
        <a
          href={url}
          download={`output-${pairId}.mp4`}
          className="underline"
        >
          ⬇️ 다운로드
        </a>
        <span style={{ color: "var(--muted)" }}>· 링크는 15분 후 만료</span>
      </div>
    </div>
  );
}
