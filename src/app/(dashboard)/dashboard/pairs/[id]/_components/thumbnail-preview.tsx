"use client";

import { useEffect, useState } from "react";

export function ThumbnailPreview({
  pairId,
  thumbnailStoragePath,
}: {
  pairId: string;
  thumbnailStoragePath?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasPath = Boolean(thumbnailStoragePath);

  useEffect(() => {
    if (!hasPath) return;
    let canceled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/pairs/${pairId}/thumbnail`);
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
  }, [pairId, hasPath]);

  if (!hasPath) {
    return (
      <div
        className="rounded-md border p-4 text-sm bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center"
        style={{ borderColor: "var(--border)", color: "var(--muted)", minHeight: 200 }}
      >
        썸네일은 변환 완료 후 표시됩니다
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="rounded-md border p-4 text-sm flex items-center justify-center"
        style={{ borderColor: "var(--border)", color: "var(--muted)", minHeight: 200 }}
      >
        썸네일 로딩 중…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-md border p-4 text-sm break-words text-red-600"
        style={{ borderColor: "var(--border)" }}
      >
        ⚠️ {error}
      </div>
    );
  }

  if (!url) return null;

  return (
    <div className="space-y-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="새 탭에서 열기"
        className="block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="자동 생성 썸네일"
          className="mx-auto rounded-md bg-black max-h-[480px] w-auto object-contain"
        />
      </a>
      <div className="flex flex-wrap gap-2 text-sm">
        <a href={url} download={`thumbnail-${pairId}.jpg`} className="underline">
          ⬇️ 다운로드
        </a>
        <span style={{ color: "var(--muted)" }}>· 9:16 (1080×1920) · 링크는 15분 후 만료</span>
      </div>
    </div>
  );
}
