"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const SLUG_REGEX = /^[a-z0-9-]+$/;

export function NewChannelForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugInvalid =
    slug.length > 0 && (!SLUG_REGEX.test(slug) || slug.length < 2 || slug.length > 40);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "등록 실패");
      setName("");
      setSlug("");
      setDescription("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border p-4 space-y-3"
      style={{ borderColor: "var(--border)" }}
    >
      <h3 className="font-semibold text-sm">새 채널</h3>
      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>
          채널명
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          className="w-full rounded border px-2 py-1 text-sm bg-transparent"
          style={{ borderColor: "var(--border)" }}
          placeholder="예: 일본 트렌드 쇼츠 #1"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>
          slug (소문자·숫자·하이픈, 2~40자 — Storage 경로 키)
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          required
          minLength={2}
          maxLength={40}
          pattern="^[a-z0-9-]+$"
          className="w-full rounded border px-2 py-1 text-sm font-mono bg-transparent"
          style={{ borderColor: slugInvalid ? "#ef4444" : "var(--border)" }}
          placeholder="jp-trend-1"
        />
        {slugInvalid && (
          <p className="text-xs text-red-600">소문자·숫자·하이픈 2~40자</p>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>
          설명 (선택)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded border px-2 py-1 text-sm bg-transparent"
          style={{ borderColor: "var(--border)" }}
        />
      </div>
      {error && <p className="text-xs text-red-600 break-words">{error}</p>}
      <Button type="submit" disabled={submitting || slugInvalid || !name || !slug} size="sm">
        {submitting ? "등록 중…" : "등록"}
      </Button>
    </form>
  );
}
