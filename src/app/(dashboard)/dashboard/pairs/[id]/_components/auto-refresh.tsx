"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const FINAL_STATUSES = new Set(["uploaded", "published", "failed"]);

/**
 * shorts_pairs.status 가 final 이 아닐 때만 5초마다 router.refresh()
 * → 진행 단계/agent_logs 자동 갱신
 */
export function AutoRefresh({ status }: { status: string }) {
  const router = useRouter();
  useEffect(() => {
    if (FINAL_STATUSES.has(status)) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [status, router]);
  return null;
}
