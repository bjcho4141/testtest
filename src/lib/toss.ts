/**
 * Toss Payments — server helper
 * - Basic Auth: TOSS_SECRET_KEY (서버 전용, 절대 클라 노출 X)
 * - Idempotency-Key: paymentKey (재시도 시 토스 측 중복 결제 방지)
 *
 * PRD §16.1 단건 결제 / §16.7 webhook 멱등성은 별도 (webhook_events 테이블).
 */
import "server-only";

const TOSS_API = "https://api.tosspayments.com";

export type TossConfirmResponse = {
  paymentKey: string;
  orderId: string;
  status: "DONE" | "READY" | "IN_PROGRESS" | "CANCELED" | "PARTIAL_CANCELED" | "FAILED" | "EXPIRED";
  method?: string;
  totalAmount: number;
  approvedAt?: string;
  [k: string]: unknown;
};

export async function confirmTossPayment(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirmResponse> {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) throw new Error("TOSS_SECRET_KEY missing");

  const auth = Buffer.from(`${secret}:`).toString("base64");

  const res = await fetch(`${TOSS_API}/v1/payments/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.paymentKey,
    },
    body: JSON.stringify(input),
  });

  const data = (await res.json()) as TossConfirmResponse & {
    code?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(
      `Toss confirm failed: ${res.status} ${data.code ?? "?"} ${data.message ?? ""}`,
    );
  }
  return data;
}

export const SUBSCRIPTION_AMOUNT_KRW = 9900;
export const SUBSCRIPTION_NAME = "utube-shorts-jp 월 구독";

function authHeader(): string {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) throw new Error("TOSS_SECRET_KEY missing");
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

export type TossBillingIssueResponse = {
  mId: string;
  customerKey: string;
  authenticatedAt: string;
  method: string;
  billingKey: string;
  cardCompany?: string;
  cardNumber?: string; // 마스킹된 카드번호
  card?: { company?: string; number?: string };
  [k: string]: unknown;
};

export async function issueTossBillingKey(input: {
  authKey: string;
  customerKey: string;
}): Promise<TossBillingIssueResponse> {
  const res = await fetch(`${TOSS_API}/v1/billing/authorizations/issue`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotency-Key": `billing:${input.customerKey}:${input.authKey}`,
    },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as TossBillingIssueResponse & {
    code?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      `Toss billing issue failed: ${res.status} ${data.code ?? "?"} ${data.message ?? ""}`,
    );
  }
  return data;
}

export type TossBillingChargeResponse = TossConfirmResponse & {
  card?: { company?: string; number?: string };
};

export async function chargeWithBillingKey(input: {
  billingKey: string;
  customerKey: string;
  orderId: string;
  amount: number;
  orderName?: string;
  customerEmail?: string;
}): Promise<TossBillingChargeResponse> {
  const res = await fetch(`${TOSS_API}/v1/billing/${input.billingKey}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotency-Key": `charge:${input.orderId}`,
    },
    body: JSON.stringify({
      customerKey: input.customerKey,
      orderId: input.orderId,
      amount: input.amount,
      orderName: input.orderName ?? SUBSCRIPTION_NAME,
      ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
    }),
  });
  const data = (await res.json()) as TossBillingChargeResponse & {
    code?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      `Toss billing charge failed: ${res.status} ${data.code ?? "?"} ${data.message ?? ""}`,
    );
  }
  return data;
}
