import { readLegal } from "@/lib/legal";
import { LegalView } from "../_components/legal-view";

export const dynamic = "force-static";
export const metadata = { title: "개인정보처리방침 — utube-shorts-jp" };

export default async function PrivacyPage() {
  const md = await readLegal("PRIVACY");
  return (
    <main className="max-w-3xl mx-auto p-6">
      <LegalView markdown={md} />
    </main>
  );
}
