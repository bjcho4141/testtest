"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const RETRY_OK_STATUSES = new Set(["failed", "review"]);

export function RetryButton({ pairId, status }: { pairId: string; status: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!RETRY_OK_STATUSES.has(status)) return null;

  async function retry() {
    if (!confirm("재변환하시겠습니까? 기존 결과물은 덮어쓰여집니다.")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pairs/${pairId}/retry`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "실패");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button variant="outline" size="sm" onClick={retry} disabled={submitting}>
        {submitting ? "처리 중…" : "🔄 재변환"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
