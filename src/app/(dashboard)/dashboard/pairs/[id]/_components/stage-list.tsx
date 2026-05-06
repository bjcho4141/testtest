/**
 * 변환 단계 7개 항상 표시 — DB 의 conversion_jobs row 가 없어도 회색 placeholder
 */
const STAGE_ORDER = [
  "download",
  "stt",
  "translation",
  "tts",
  "crop",
  "subtitle",
  "render",
] as const;

const STAGE_LABEL: Record<string, string> = {
  download: "다운로드",
  stt: "음성 인식",
  translation: "번역",
  tts: "일본어 TTS",
  crop: "9:16 크롭",
  subtitle: "자막",
  render: "렌더",
};

const JOB_STATUS_CLS: Record<string, string> = {
  queued: "bg-neutral-100 text-neutral-700",
  running: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
  pending: "bg-neutral-50 text-neutral-400",
};

const STATUS_LABEL: Record<string, string> = {
  queued: "대기",
  running: "진행 중",
  done: "완료",
  failed: "실패",
  pending: "—",
};

export type StageJob = {
  id: string;
  stage: string;
  status: string;
  attempt: number;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
};

export function StageList({ jobs }: { jobs: StageJob[] }) {
  // stage 별 최신 row 매핑 (같은 stage 여러 attempt 면 최신만)
  const byStage = new Map<string, StageJob>();
  for (const j of jobs) {
    const prev = byStage.get(j.stage);
    if (!prev || (j.attempt ?? 1) > (prev.attempt ?? 1)) {
      byStage.set(j.stage, j);
    }
  }

  return (
    <ul className="rounded-md border divide-y" style={{ borderColor: "var(--border)" }}>
      {STAGE_ORDER.map((s, i) => {
        const j = byStage.get(s);
        const status = j?.status ?? "pending";
        const cls = JOB_STATUS_CLS[status] ?? "bg-neutral-100";
        return (
          <li key={s} className="p-3 flex items-center gap-3 text-sm flex-wrap">
            <span className="text-xs font-mono w-6" style={{ color: "var(--muted)" }}>
              {i + 1}.
            </span>
            <span className="font-medium w-24">{STAGE_LABEL[s] ?? s}</span>
            <span className={`text-xs rounded px-2 py-0.5 ${cls}`}>{STATUS_LABEL[status] ?? status}</span>
            {j && j.attempt > 1 && (
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                시도 {j.attempt}
              </span>
            )}
            <span className="text-xs ml-auto" style={{ color: "var(--muted)" }}>
              {j?.finished_at
                ? new Date(j.finished_at).toLocaleTimeString("ko-KR")
                : j?.started_at
                  ? `시작 ${new Date(j.started_at).toLocaleTimeString("ko-KR")}`
                  : "—"}
            </span>
            {j?.error_message && (
              <p className="basis-full text-xs text-red-600 break-words">{j.error_message}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
