import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="border-t mt-auto px-4 py-3 text-xs flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
      style={{ borderColor: "var(--border)", color: "var(--muted)" }}
    >
      <span>© 2026 utube-shorts-jp</span>
      <Link href="/terms" className="hover:underline">이용약관</Link>
      <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
      <Link href="/refund" className="hover:underline">환불정책</Link>
    </footer>
  );
}
