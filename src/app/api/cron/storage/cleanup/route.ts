/**
 * Storage 자동 정리 cron (PRD Phase 6)
 *
 * 매일 04:00 KST (19:00 UTC) — vercel.json crons "0 19 * * *"
 *
 * media-input / media-artifacts 버킷의 7일 경과 객체 삭제
 * (media-output / thumbnails 는 보존)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { checkCronAuth } from "@/lib/cron-auth";

const RETENTION_DAYS = 7;
const TARGET_BUCKETS = ["media-input", "media-artifacts"] as const;

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
  const summary: Record<string, { listed: number; deleted: number; error?: string }> = {};

  for (const bucket of TARGET_BUCKETS) {
    summary[bucket] = { listed: 0, deleted: 0 };
    try {
      const { data: objs, error } = await admin.storage
        .from(bucket)
        .list("", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
      if (error) throw new Error(error.message);
      const old = (objs ?? []).filter(
        (o) => o.created_at && new Date(o.created_at).toISOString() < cutoff,
      );
      summary[bucket].listed = old.length;
      if (old.length > 0) {
        const { error: rmErr } = await admin.storage.from(bucket).remove(old.map((o) => o.name));
        if (rmErr) throw new Error(rmErr.message);
        summary[bucket].deleted = old.length;
      }
    } catch (e) {
      summary[bucket].error = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({ ok: true, cutoff, summary });
}
