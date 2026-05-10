/**
 * 페어 상세 — Server Actions.
 *
 * revealInFinder: stage 산출물(중간 파일) 절대경로를 받아 macOS Finder 에서
 * 해당 파일을 선택 상태로 열기. DEV + 슈퍼어드민만 허용 + path traversal 차단.
 */
"use server";

import { spawn } from "node:child_process";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

const SUPERADMIN_EMAIL = "bjcho9542@gmail.com";

export type RevealResult = { ok: true } | { ok: false; error: string };

export async function revealInFinder(absPath: string): Promise<RevealResult> {
  // 1) DEV 모드 게이트 — 프로덕션 빌드에선 항상 거부.
  if (process.env.NODE_ENV !== "development") {
    return { ok: false, error: "DEV 모드에서만 사용 가능" };
  }

  // 2) 슈퍼어드민 게이트.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return { ok: false, error: "슈퍼어드민만 사용 가능" };
  }

  // 3) 입력 sanity — 절대경로 + path traversal 차단.
  if (typeof absPath !== "string" || !absPath) {
    return { ok: false, error: "경로 누락" };
  }
  const normalized = path.resolve(absPath);
  if (normalized !== path.normalize(absPath) || absPath.includes("..")) {
    return { ok: false, error: "허용되지 않은 경로 (정규화 실패)" };
  }

  // 4) 화이트리스트 prefix — PoC 작업 디렉토리 / 시스템 tmp 만 허용.
  const allowed = [
    process.env.WORKER_POC_PATH ?? "/Users/cho/Desktop/4141/poc-jp",
    process.env.WORKER_TMP_PATH ?? "/tmp",
  ];
  if (!allowed.some((prefix) => normalized.startsWith(prefix))) {
    return { ok: false, error: "허용되지 않은 경로" };
  }

  // 5) Finder 에서 해당 파일 선택 상태로 열기.
  spawn("open", ["-R", normalized], { detached: true, stdio: "ignore" }).unref();
  return { ok: true };
}
