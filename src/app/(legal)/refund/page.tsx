import { readLegal } from "@/lib/legal";
import { LegalView } from "../_components/legal-view";

export const dynamic = "force-static";
export const metadata = { title: "환불정책 — utube-shorts-jp" };

export default async function RefundPage() {
  const md = await readLegal("REFUND");
  return (
    <main className="max-w-3xl mx-auto p-6">
      <LegalView markdown={md} />
    </main>
  );
}
