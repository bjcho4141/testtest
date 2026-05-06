"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const FINAL_STATUSES = new Set(["uploaded", "published", "failed"]);
// processing 중에는 빈번하게 (2s), review/queued/pending 은 덜 자주 (5s)
const ACTIVE_STATUSES = new Set(["processing", "queued"]);

export function AutoRefresh({ status }: { status: string }) {
  const router = useRouter();
  useEffect(() => {
    if (FINAL_STATUSES.has(status)) return;
    const interval = ACTIVE_STATUSES.has(status) ? 2000 : 5000;
    const t = setInterval(() => router.refresh(), interval);
    return () => clearInterval(t);
  }, [status, router]);
  return null;
}
