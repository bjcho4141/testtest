"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteButton({ pairId }: { pairId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    if (!confirm("이 페어를 삭제하시겠습니까? 변환 결과·로그 모두 사라집니다.")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pairs/${pairId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "실패");
      router.push("/dashboard/pairs");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={del} disabled={submitting}>
        {submitting ? "삭제 중…" : "🗑️ 페어 삭제"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
