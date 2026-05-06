import { LoginButton } from "./_components/login-button";
import { Footer } from "./_components/footer";

type SearchParams = Promise<{ login?: string; reason?: string }>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { login, reason } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">utube-shorts-jp</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            CC 라이선스 영상 → 한일 쇼츠 자동 변환·업로드
          </p>
        </div>

        {login === "required" && (
          <div className="text-sm rounded-md px-4 py-2 border border-amber-300 bg-amber-50 text-amber-900">
            로그인이 필요한 페이지입니다.
          </div>
        )}
        {login === "error" && (
          <div className="text-sm rounded-md px-4 py-2 border border-red-300 bg-red-50 text-red-900">
            로그인 처리 실패 ({reason ?? "unknown"})
          </div>
        )}

        <LoginButton />

        <p className="text-xs" style={{ color: "var(--muted)" }}>
          카카오 계정으로 로그인 — Supabase Auth (Provider 미설정 시 에러 표시 정상)
        </p>
      </main>
      <Footer />
    </div>
  );
}
