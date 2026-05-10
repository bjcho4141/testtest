"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export type MetaShape = {
  title?: string;
  description?: string;
  tags?: string[];
};

export function MetaEditor({
  pairId,
  initial,
  youtubeMeta,
}: {
  pairId: string;
  /** user 가 직접 저장한 값 (original_meta.result). 우선순위 1 */
  initial: MetaShape | null;
  /** 워커가 자동 생성한 값 (original_meta.youtube_meta). user 값 없을 때 prefill */
  youtubeMeta?: MetaShape | null;
}) {
  const router = useRouter();
  const userHasSaved =
    Boolean(initial?.title) || Boolean(initial?.description) || (initial?.tags?.length ?? 0) > 0;
  const source: MetaShape | null = userHasSaved ? (initial ?? null) : (youtubeMeta ?? initial ?? null);
  const prefilledFromYoutube = !userHasSaved && Boolean(youtubeMeta);

  const [title, setTitle] = useState(source?.title ?? "");
  const [description, setDescription] = useState(source?.description ?? "");
  const [tagsRaw, setTagsRaw] = useState((source?.tags ?? []).join(", "));
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const showAutoBadge = prefilledFromYoutube && !dirty && !userHasSaved;

  async function save() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const tags = tagsRaw
        .split(/[,\n]/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);
      const res = await fetch(`/api/pairs/${pairId}/meta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, tags }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "저장 실패");
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      setDirty(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function copyForUpload() {
    const tagLine = tagsRaw
      .split(/[,\n]/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean)
      .map((t) => `#${t}`)
      .join(" ");
    const blob = `${title}\n\n${description}\n\n${tagLine}`;
    navigator.clipboard.writeText(blob);
    setSavedAt(`복사 ${new Date().toLocaleTimeString("ko-KR")}`);
  }

  return (
    <div
      className="rounded-md border p-4 space-y-3 text-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">업로드 메타 (제목·설명·태그)</h3>
          {showAutoBadge && (
            <span
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{
                borderColor: "var(--border)",
                background: "var(--muted-bg, transparent)",
                color: "var(--muted)",
              }}
              title="필요하면 수정하세요"
            >
              ✨ 자동 생성됨
            </span>
          )}
        </div>
        {savedAt && <span className="text-xs" style={{ color: "var(--muted)" }}>{savedAt}</span>}
      </div>
      {showAutoBadge && (
        <p className="text-[11px]" style={{ color: "var(--muted)" }}>
          AI 가 영상 내용을 바탕으로 자동 생성한 메타입니다. 필요하면 수정 후 저장하세요.
        </p>
      )}

      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>제목 (최대 100자)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          maxLength={100}
          className="w-full rounded border px-2 py-1 bg-transparent"
          style={{ borderColor: "var(--border)" }}
          placeholder="일본어 영상 제목"
        />
        <p className="text-[10px] text-right" style={{ color: "var(--muted)" }}>
          {title.length} / 100
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>설명 (최대 5000자, YouTube description)</label>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setDirty(true);
          }}
          maxLength={5000}
          rows={5}
          className="w-full rounded border px-2 py-1 bg-transparent font-mono text-xs"
          style={{ borderColor: "var(--border)" }}
          placeholder="영상 설명. 첫 줄은 후크. 마지막에 출처/원작자/AI 고지 권장 (PRD §15)"
        />
        <p className="text-[10px] text-right" style={{ color: "var(--muted)" }}>
          {description.length} / 5000
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>태그 (콤마 또는 줄바꿈으로 구분, 최대 20개)</label>
        <input
          type="text"
          value={tagsRaw}
          onChange={(e) => {
            setTagsRaw(e.target.value);
            setDirty(true);
          }}
          className="w-full rounded border px-2 py-1 bg-transparent"
          style={{ borderColor: "var(--border)" }}
          placeholder="お笑い, インタビュー, KBS"
        />
      </div>

      {error && <p className="text-xs text-red-600 break-words">{error}</p>}

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={save} disabled={submitting}>
          {submitting ? "저장 중…" : "💾 저장"}
        </Button>
        <Button size="sm" variant="outline" onClick={copyForUpload} disabled={!title && !description}>
          📋 제목+설명+태그 복사
        </Button>
      </div>
    </div>
  );
}
