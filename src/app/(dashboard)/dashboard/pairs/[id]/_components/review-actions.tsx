"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * 검수 액션 — review 상태일 때만 표시
 *   ✅ 업로드 완료: review → uploaded (사용자가 본인 채널 업로드 후 마킹)
 *   ❌ 반려: review → failed (결과 마음에 안 들 때)
 *   🔄 재변환은 별도 RetryButton (failed/review 둘 다 표시)
 */
export function ReviewActions({ pairId, status }: { pairId: string; status: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "review") return null;

  async function call(kind: "approve" | "reject") {
    if (submitting) return;
    if (kind === "reject" && !confirm("반려하면 페어가 failed 처리됩니다. 진행할까요?")) return;
    setSubmitting(kind);
    setError(null);
    try {
      const res = await fetch(`/api/pairs/${pairId}/${kind}`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "실패");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => call("approve")} disabled={submitting !== null}>
          {submitting === "approve" ? "처리 중…" : "✅ 업로드 완료"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => call("reject")}
          disabled={submitting !== null}
        >
          {submitting === "reject" ? "처리 중…" : "❌ 반려"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-[10px]" style={{ color: "var(--muted)" }}>
        다운로드 후 본인 채널에 업로드 끝나면 "업로드 완료" 클릭
      </p>
    </div>
  );
}
