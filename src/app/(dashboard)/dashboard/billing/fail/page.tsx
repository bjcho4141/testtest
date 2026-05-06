import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

type SP = Promise<{ code?: string; message?: string; orderId?: string }>;

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { code, message, orderId } = await searchParams;
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">결제 실패</h1>
      <dl className="text-sm space-y-1">
        {code && (
          <div>
            <dt className="inline font-medium">코드: </dt>
            <dd className="inline">{code}</dd>
          </div>
        )}
        {message && (
          <div>
            <dt className="inline font-medium">메시지: </dt>
            <dd className="inline">{message}</dd>
          </div>
        )}
        {orderId && (
          <div>
            <dt className="inline font-medium">주문번호: </dt>
            <dd className="inline">{orderId}</dd>
          </div>
        )}
      </dl>
      <Link href="/dashboard/billing" className={buttonVariants()}>
        다시 시도
      </Link>
    </div>
  );
}
