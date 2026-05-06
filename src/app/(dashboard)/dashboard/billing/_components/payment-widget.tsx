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
    if (!widgets) return;
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
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4 bg-neutral-50 dark:bg-neutral-900 text-sm">
        월 구독 — <strong>{AMOUNT.toLocaleString("ko-KR")}원</strong> · {ORDER_NAME}
      </div>
      <div id="payment-method" />
      <div id="agreement" />
      {error && (
        <p className="text-xs text-red-600 break-words">결제 위젯 오류: {error}</p>
      )}
      <Button size="lg" onClick={pay} disabled={!ready}>
        {ready ? "결제하기" : "결제 위젯 로딩…"}
      </Button>
    </div>
  );
}
