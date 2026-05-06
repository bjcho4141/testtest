/**
 * 30일 전 사전고지 cron (전자상거래법 §20조의2 / PRD §16.6)
 *
 * 매일 09:00 KST (00:00 UTC) — vercel.json crons "0 0 * * *"
 *
 * agent_logs 에 사전고지 row INSERT (실제 이메일 발송은 SMTP 설정 후 별도 작업)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return (req.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const window = new Date(now);
  window.setDate(window.getDate() + 30);

  const { data: subs } = await admin
    .from("subscriptions")
    .select("id, user_id, next_charge_at, amount")
    .eq("status", "active")
    .lte("next_charge_at", window.toISOString())
    .gte("next_charge_at", now.toISOString());

  const list =
    (subs as Array<{
      id: string;
      user_id: string;
      next_charge_at: string;
      amount: number;
    }> | null) ?? [];

  let notified = 0;
  for (const s of list) {
    // 채널 1개 임의 매칭 (sub 자체는 channel 없음 → 사용자별 첫 채널)
    const { data: ch } = await admin
      .from("channels")
      .select("id")
      .eq("owner_id", s.user_id)
      .limit(1)
      .maybeSingle();
    const channelId = (ch as { id: string } | null)?.id ?? null;

    await admin.from("agent_logs").insert({
      channel_id: channelId,
      from_actor: "system",
      to_actor: "user",
      type: "report",
      message: `[사전고지] ${new Date(s.next_charge_at).toLocaleDateString("ko-KR")} 정기결제 ${s.amount.toLocaleString("ko-KR")}원 예정 (전자상거래법 §20조의2)`,
    } as never);
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
