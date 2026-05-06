"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const URL_REGEX = /^https?:\/\/[^\s]+$/i;

export function NewPairForm({
  channels,
}: {
  channels: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [koreanUrl, setKoreanUrl] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [licenseSource, setLicenseSource] = useState<"cc" | "self_filmed">("cc");
  const [licenseEvidenceUrl, setLicenseEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (channels.length === 0) {
    return (
      <div
        className="rounded-md border p-4 text-sm bg-amber-50 border-amber-300 text-amber-900"
      >
        먼저 <a href="/dashboard/channels" className="underline">채널 등록</a>이 필요합니다.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!URL_REGEX.test(koreanUrl)) {
      setError("한국 URL 형식 오류");
      return;
    }
    if (!URL_REGEX.test(licenseEvidenceUrl)) {
      setError("라이선스 증거 URL 필수");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/pairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: channelId,
          korean_url: koreanUrl,
          original_url: originalUrl || undefined,
          license_source: licenseSource,
          license_evidence_url: licenseEvidenceUrl,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "등록 실패");
      setKoreanUrl("");
      setOriginalUrl("");
      setLicenseEvidenceUrl("");
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
      <h3 className="font-semibold text-sm">새 영상 페어</h3>

      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>
          채널
        </label>
        <select
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          className="w-full rounded border px-2 py-1 text-sm bg-transparent"
          style={{ borderColor: "var(--border)" }}
        >
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.slug})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>
          한국 숏츠 URL <span className="text-red-600">*</span>
        </label>
        <input
          type="url"
          value={koreanUrl}
          onChange={(e) => setKoreanUrl(e.target.value)}
          required
          className="w-full rounded border px-2 py-1 text-sm font-mono bg-transparent"
          style={{ borderColor: "var(--border)" }}
          placeholder="https://www.youtube.com/shorts/..."
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>
          원본 영상 URL (선택)
        </label>
        <input
          type="url"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          className="w-full rounded border px-2 py-1 text-sm font-mono bg-transparent"
          style={{ borderColor: "var(--border)" }}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>
          라이선스 <span className="text-red-600">*</span>
        </label>
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="license"
              value="cc"
              checked={licenseSource === "cc"}
              onChange={() => setLicenseSource("cc")}
            />
            CC (Creative Commons)
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="license"
              value="self_filmed"
              checked={licenseSource === "self_filmed"}
              onChange={() => setLicenseSource("self_filmed")}
            />
            self_filmed (직접 촬영)
          </label>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>
          라이선스 증거 URL <span className="text-red-600">*</span> (CC: YouTube CC 표시 페이지 / self_filmed: 본인 채널/SNS 게시 URL)
        </label>
        <input
          type="url"
          value={licenseEvidenceUrl}
          onChange={(e) => setLicenseEvidenceUrl(e.target.value)}
          required
          className="w-full rounded border px-2 py-1 text-sm font-mono bg-transparent"
          style={{ borderColor: "var(--border)" }}
        />
      </div>

      {error && <p className="text-xs text-red-600 break-words">{error}</p>}
      <Button type="submit" disabled={submitting} size="sm">
        {submitting ? "등록 중…" : "등록"}
      </Button>
    </form>
  );
}
