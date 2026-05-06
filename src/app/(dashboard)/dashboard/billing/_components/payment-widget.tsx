"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { Button } from "@/components/ui/button";

const AMOUNT = 9900;
const ORDER_NAME = "utube-shorts-jp 월 구독";

export function PaymentWidget({
  clientKey,
  customerKey,
}: {
  clientKey: string;
  customerKey: string;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundAgreed, setRefundAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const tossPayments = await loadTossPayments(clientKey);
        if (canceled) return;
        const w = tossPayments.widgets({ customerKey });
        await w.setAmount({ currency: "KRW", value: AMOUNT });
        await Promise.all([
          w.renderPaymentMethods({
            selector: "#payment-method",
            variantKey: "DEFAULT",
          }),
          w.renderAgreement({
            selector: "#agreement",
            variantKey: "AGREEMENT",
          }),
        ]);
        if (canceled) return;
        widgetsRef.current = w;
        setReady(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [clientKey, customerKey]);

  async function pay() {
    const widgets = widgetsRef.current;
    if (!widgets || submitting) return;
    if (!refundAgreed) {
      setError("환불정책 동의가 필요합니다");
      return;
    }
    setSubmitting(true);
    setError(null);
    // 5초 disable 락 (중복 결제 방지 §13.3)
    setTimeout(() => setSubmitting(false), 5000);

    const orderId = `ord_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    try {
      await widgets.requestPayment({
        orderId,
        orderName: ORDER_NAME,
        successUrl: `${window.location.origin}/dashboard/billing/success`,
        failUrl: `${window.location.origin}/dashboard/billing/fail`,
        customerEmail: undefined,
        customerName: undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 w-full">
      <div className="rounded-md border p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-900 text-sm">
        월 구독 — <strong>{AMOUNT.toLocaleString("ko-KR")}원</strong>
        <span className="block sm:inline sm:ml-1 text-xs sm:text-sm" style={{ color: "var(--muted)" }}>
          · {ORDER_NAME}
        </span>
      </div>
      <div id="payment-method" className="w-full" />
      <div id="agreement" className="w-full" />
      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={refundAgreed}
          onChange={(e) => setRefundAgreed(e.target.checked)}
          className="mt-1"
        />
        <span>
          [필수]{" "}
          <a href="/refund" target="_blank" rel="noopener noreferrer" className="underline">
            환불정책
          </a>
          에 동의합니다 (전자상거래법 §17 청약철회 7일 / 디지털 콘텐츠 사용 시작 시 제한 등)
        </span>
      </label>
      {error && (
        <p className="text-xs text-red-600 break-words">{error}</p>
      )}
      <Button
        size="lg"
        onClick={pay}
        disabled={!ready || !refundAgreed || submitting}
        className="w-full sm:w-auto"
      >
        {submitting ? "처리 중…" : ready ? "결제하기" : "결제 위젯 로딩…"}
      </Button>
    </div>
  );
}
