/**
 * 변환 워커 → agent_logs INSERT (소통방)
 *
 * body: { pairId?, channelId?, fromActor, toActor, type, message, step? }
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyCliRequest } from "@/lib/cli-auth";

const ALLOWED_TYPE = ["command", "report", "gate", "error"] as const;

export async function POST(request: NextRequest) {
  const auth = verifyCliRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  let body: {
    pairId?: string;
    channelId?: string;
    fromActor?: string;
    toActor?: string;
    type?: string;
    message?: string;
    step?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { pairId, channelId, fromActor, toActor, type, message, step } = body;
  if (!fromActor || !toActor || !type || !message) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!(ALLOWED_TYPE as readonly string[]).includes(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_logs")
    .insert({
      pair_id: pairId ?? null,
      channel_id: channelId ?? null,
      from_actor: fromActor,
      to_actor: toActor,
      type,
      message,
      step: step ?? null,
    } as never)
    .select("id, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, log: data });
}
