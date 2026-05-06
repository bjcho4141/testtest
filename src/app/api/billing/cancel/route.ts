/**
 * 구독 해지 (PRD §16.3, §13.3)
 *
 * - 본인 active 구독을 canceled 로 전환 (paid_until 까지는 유지)
 * - 빌링키도 revoke (재사용 차단)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: now } as never)
    .eq("user_id", user.id)
    .eq("status", "active");

  await admin
    .from("billing_keys")
    .update({ status: "revoked", revoked_at: now } as never)
    .eq("user_id", user.id)
    .eq("status", "active");

  return NextResponse.json({ ok: true });
}
