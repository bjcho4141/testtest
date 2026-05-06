"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const PRESETS: { name: string; voice_id: string; desc: string }[] = [
  { name: "기본 (다국어 여성)", voice_id: "21m00Tcm4TlvDq8ikWAM", desc: "Rachel — multilingual default" },
  { name: "남성 (Adam)", voice_id: "pNInz6obpgDQGcFmaJgB", desc: "차분한 일본어 남성톤" },
  { name: "젊은 여성 (Domi)", voice_id: "AZnzlk1XvdvUeBnXmlld", desc: "발랄한 톤" },
  { name: "Bella", voice_id: "EXAVITQu4vr4xnSDxMaL", desc: "부드러운 여성" },
  { name: "Antoni", voice_id: "ErXwobaYiN019PkySvjV", desc: "자연스러운 남성" },
];

export function VoicePicker({
  pairId,
  initial,
}: {
  pairId: string;
  initial: { voice_id?: string; model_id?: string } | null;
}) {
  const router = useRouter();
  const [voiceId, setVoiceId] = useState(initial?.voice_id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pairs/${pairId}/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_id: voiceId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "저장 실패");
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rounded-md border p-4 space-y-3 text-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">일본어 voice (ElevenLabs)</h3>
        {savedAt && <span className="text-xs" style={{ color: "var(--muted)" }}>저장 {savedAt}</span>}
      </div>

      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>프리셋</label>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.voice_id}
              type="button"
              onClick={() => setVoiceId(p.voice_id)}
              className={`text-xs px-2 py-1 rounded border ${voiceId === p.voice_id ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-black" : "bg-transparent"}`}
              style={voiceId === p.voice_id ? {} : { borderColor: "var(--border)" }}
              title={p.desc}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--muted)" }}>
          또는 직접 voice_id (ElevenLabs Voice Library 의 ID)
        </label>
        <input
          type="text"
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          className="w-full rounded border px-2 py-1 bg-transparent font-mono text-xs"
          style={{ borderColor: "var(--border)" }}
          placeholder="21m00Tcm4TlvDq8ikWAM"
        />
        <p className="text-[10px]" style={{ color: "var(--muted)" }}>
          비워두면 워커 기본값 (env ELEVENLABS_VOICE_ID) 사용. 변경 후 🔄 재변환 필요.
        </p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Button size="sm" onClick={save} disabled={submitting}>
        {submitting ? "저장 중…" : "💾 저장"}
      </Button>
    </div>
  );
}
