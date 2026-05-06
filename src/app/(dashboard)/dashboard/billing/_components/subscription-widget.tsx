"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { Button } from "@/components/ui/button";

type TossPaymentsInstance = Awaited<ReturnType<typeof loadTossPayments>>;

export function SubscriptionWidget({
  clientKey,
  customerKey,
  customerEmail,
}: {
  clientKey: string;
  customerKey: string;
  customerEmail?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const tpRef = useRef<TossPaymentsInstance | null>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const tp = await loadTossPayments(clientKey);
        if (canceled) return;
        tpRef.current = tp;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [clientKey]);

  async function startBillingAuth() {
    if (!tpRef.current || submitting) return;
    setSubmitting(true);
    setError(null);
    setTimeout(() => setSubmitting(false), 5000);

    try {
      const payment = tpRef.current.payment({ customerKey });
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/dashboard/billing/auth-success`,
        failUrl: `${window.location.origin}/dashboard/billing/auth-fail`,
        ...(customerEmail ? { customerEmail } : {}),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="lg"
        onClick={startBillingAuth}
        disabled={submitting}
        className="w-full sm:w-auto"
      >
        {submitting ? "처리 중…" : "정기결제 카드 등록"}
      </Button>
      {error && <p className="text-xs text-red-600 break-words">{error}</p>}
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        매월 9,900원 자동 청구. 언제든 해지 가능. 30일 전 사전고지 (전자상거래법 §20조의2).
      </p>
    </div>
  );
}
