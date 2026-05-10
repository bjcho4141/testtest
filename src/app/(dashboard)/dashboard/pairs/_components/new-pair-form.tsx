"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [licenseSource, setLicenseSource] = useState<"cc" | "self_filmed">("cc");
  const [licenseEvidenceUrl, setLicenseEvidenceUrl] = useState("");
  const [startMin, setStartMin] = useState("0");
  const [startSec, setStartSec] = useState("0");
  const [duration, setDuration] = useState("59");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (channels.length === 0) {
    return (
      <div
        className="rounded-md border p-4 text-sm bg-amber-50 border-amber-300 text-amber-900 space-y-3"
      >
        <p>먼저 게시 채널을 등록해야 영상 페어를 만들 수 있어요.</p>
        <Link href="/dashboard/channels">
          <Button size="sm">+ 새 채널 만들기</Button>
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!URL_REGEX.test(koreanUrl)) {
      setError("한국 Shorts URL 형식 오류");
      return;
    }
    if (!URL_REGEX.test(licenseEvidenceUrl)) {
      setError("권한 증빙 링크 필수");
      return;
    }
    const startSeconds = parseInt(startMin || "0", 10) * 60 + parseInt(startSec || "0", 10);
    const dur = parseInt(duration || "59", 10);
    if (isNaN(startSeconds) || startSeconds < 0) {
      setError("시작 시간은 0 이상");
      return;
    }
    if (isNaN(dur) || dur < 5 || dur > 180) {
      setError("길이는 5 ~ 180초");
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
          orientation,
          license_source: licenseSource,
          license_evidence_url: licenseEvidenceUrl,
          start_seconds: startSeconds,
          duration: dur,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        pair?: { id?: string };
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "등록 실패");
      const pairId = data.pair?.id;
      if (pairId) {
        router.push(`/dashboard/pairs/${pairId}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const sectionStyle = "rounded-md border p-3 space-y-3";
  const sectionHeader = "text-xs font-semibold uppercase tracking-wide";

  return (
    <form
      onSubmit={submit}
      className="rounded-md border p-4 space-y-4"
      style={{ borderColor: "var(--border)" }}
    >
      <h3 className="font-semibold text-sm">새 영상 페어</h3>

      {/* ── 섹션 1: 기본 정보 ─────────────────────────── */}
      <fieldset className={sectionStyle} style={{ borderColor: "var(--border)" }}>
        <legend className={sectionHeader} style={{ color: "var(--muted)" }}>
          1. 기본 정보
        </legend>

        <div className="space-y-1">
          <label
            className="text-xs flex items-center gap-1"
            style={{ color: "var(--muted)" }}
            title="변환된 영상이 업로드될 YouTube 채널"
          >
            게시 채널 <span className="text-red-600">*</span>
            <span className="cursor-help" aria-label="도움말">ⓘ</span>
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
          <label
            className="text-xs flex items-center gap-1"
            style={{ color: "var(--muted)" }}
            title="일본판으로 변환할 원본 한국 Shorts"
          >
            한국 Shorts URL <span className="text-red-600">*</span>
            <span className="cursor-help" aria-label="도움말">ⓘ</span>
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
          <label
            className="text-xs flex items-center gap-1"
            style={{ color: "var(--muted)" }}
            title="Shorts 가 잘려나온 원본 영상 (매칭 검증용)"
          >
            원본 풀버전 URL (선택)
            <span className="cursor-help" aria-label="도움말">ⓘ</span>
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
      </fieldset>

      {/* ── 섹션 2: 영상 옵션 ─────────────────────────── */}
      <fieldset className={sectionStyle} style={{ borderColor: "var(--border)" }}>
        <legend className={sectionHeader} style={{ color: "var(--muted)" }}>
          2. 영상 옵션
        </legend>

        <div className="space-y-1">
          <label
            className="text-xs flex items-center gap-1"
            style={{ color: "var(--muted)" }}
            title="결과물은 항상 9:16. 원본이 가로면 위·아래 띠에 자막 배치"
          >
            영상 비율 <span className="text-red-600">*</span>
            <span className="cursor-help" aria-label="도움말">ⓘ</span>
          </label>
          <div className="flex flex-col gap-1 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="orientation"
                value="vertical"
                checked={orientation === "vertical"}
                onChange={() => setOrientation("vertical")}
              />
              <span>세로 (9:16) — Shorts·Reels 원본</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="orientation"
                value="horizontal"
                checked={orientation === "horizontal"}
                onChange={() => setOrientation("horizontal")}
              />
              <span>가로 (16:9) — 일반 YouTube/방송 원본</span>
            </label>
          </div>
          <small className="text-[11px]" style={{ color: "var(--muted)" }}>
            원본이 가로면 결과 영상의 위·아래 검은 띠에 타이틀과 자막이 배치됩니다
          </small>
        </div>

        <div className="space-y-1">
          <label
            className="text-xs flex items-center gap-1"
            style={{ color: "var(--muted)" }}
            title="원본의 어느 부분을 잘라낼지 (한국판과 동일 구간)"
          >
            자를 구간 <span className="text-red-600">*</span>
            <span className="cursor-help" aria-label="도움말">ⓘ</span>
          </label>
          <div className="flex gap-2 items-center text-sm flex-wrap">
            <input
              type="number"
              min="0"
              value={startMin}
              onChange={(e) => setStartMin(e.target.value)}
              className="w-16 rounded border px-2 py-1 bg-transparent text-center"
              style={{ borderColor: "var(--border)" }}
              placeholder="분"
            />
            <span style={{ color: "var(--muted)" }}>분</span>
            <input
              type="number"
              min="0"
              max="59"
              value={startSec}
              onChange={(e) => setStartSec(e.target.value)}
              className="w-16 rounded border px-2 py-1 bg-transparent text-center"
              style={{ borderColor: "var(--border)" }}
              placeholder="초"
            />
            <span style={{ color: "var(--muted)" }}>초</span>
            <span className="ml-2" style={{ color: "var(--muted)" }}>부터</span>
            <input
              type="number"
              min="5"
              max="180"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-20 rounded border px-2 py-1 bg-transparent text-center"
              style={{ borderColor: "var(--border)" }}
            />
            <span style={{ color: "var(--muted)" }}>초간</span>
          </div>
          <p className="text-[10px]" style={{ color: "var(--muted)" }}>
            예: 3분 33초부터 59초간
          </p>
        </div>
      </fieldset>

      {/* ── 섹션 3: 사용 권한 ─────────────────────────── */}
      <fieldset className={sectionStyle} style={{ borderColor: "var(--border)" }}>
        <legend className={sectionHeader} style={{ color: "var(--muted)" }}>
          3. 사용 권한
        </legend>

        <div className="space-y-1">
          <label
            className="text-xs flex items-center gap-1"
            style={{ color: "var(--muted)" }}
            title="CC: 원작자가 재사용 허용 / 본인 촬영: self_filmed"
          >
            사용 권한 <span className="text-red-600">*</span>
            <span className="cursor-help" aria-label="도움말">ⓘ</span>
          </label>
          <div className="flex gap-3 text-sm flex-wrap">
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
          <label
            className="text-xs flex items-center gap-1"
            style={{ color: "var(--muted)" }}
            title="CC 페이지 또는 본인 SNS 게시물 URL"
          >
            권한 증빙 링크 <span className="text-red-600">*</span>
            <span className="cursor-help" aria-label="도움말">ⓘ</span>
          </label>
          <input
            type="url"
            value={licenseEvidenceUrl}
            onChange={(e) => setLicenseEvidenceUrl(e.target.value)}
            required
            className="w-full rounded border px-2 py-1 text-sm font-mono bg-transparent"
            style={{ borderColor: "var(--border)" }}
            placeholder="https://..."
          />
          <p className="text-[10px]" style={{ color: "var(--muted)" }}>
            CC: YouTube CC 표시 페이지 / self_filmed: 본인 채널/SNS 게시 URL
          </p>
        </div>
      </fieldset>

      {error && <p className="text-xs text-red-600 break-words">{error}</p>}

      <p className="text-sm" style={{ color: "var(--muted)" }}>
        등록하면 영상 변환이 자동으로 시작됩니다 (~5~10분). 다음 화면에서 진행 상황을 확인할 수 있어요.
      </p>

      <Button type="submit" disabled={submitting} size="sm">
        {submitting ? "등록 중…" : "등록"}
      </Button>
    </form>
  );
}
