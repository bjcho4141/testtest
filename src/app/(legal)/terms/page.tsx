import { readLegal } from "@/lib/legal";
import { LegalView } from "../_components/legal-view";

export const dynamic = "force-static";
export const metadata = { title: "이용약관 — utube-shorts-jp" };

export default async function TermsPage() {
  const md = await readLegal("TERMS");
  return (
    <main className="max-w-3xl mx-auto p-6">
      <LegalView markdown={md} />
    </main>
  );
}
