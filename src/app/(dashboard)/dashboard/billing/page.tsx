type SearchParams = Promise<{ from?: string }>;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { from } = await searchParams;

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">결제</h1>
      {from === "blocked" && (
        <div className="text-sm rounded-md px-4 py-2 border border-amber-300 bg-amber-50 text-amber-900">
          유료 구독이 필요한 페이지입니다. 결제 후 이용해 주세요.
        </div>
      )}
      {from === "rpc_error" && (
        <div className="text-sm rounded-md px-4 py-2 border border-red-300 bg-red-50 text-red-900">
          결제 상태 확인 실패. 잠시 후 다시 시도해 주세요.
        </div>
      )}
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        준비 중 — Phase 4에서 토스페이먼츠 결제 UI가 들어옵니다.
      </p>
    </div>
  );
}
