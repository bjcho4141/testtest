import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Footer } from "../_components/footer";

// 인증 / 결제 게이트 동적 페이지 — 정적 prerender 회피
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* 모바일 상단 네비 */}
      <header
        className="md:hidden flex items-center justify-between border-b px-4 py-3 sticky top-0 z-10 bg-[var(--background,#fff)]"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          utube-shorts-jp
        </div>
        <nav className="flex items-center gap-1">
          <NavLink href="/dashboard">홈</NavLink>
          <NavLink href="/dashboard/channels">채널</NavLink>
          <NavLink href="/dashboard/pairs">영상</NavLink>
          <NavLink href="/dashboard/analytics">분석</NavLink>
          <NavLink href="/dashboard/billing">결제</NavLink>
        </nav>
      </header>

      {/* 데스크톱 사이드바 */}
      <aside
        className="hidden md:flex w-60 border-r p-4 flex-col gap-2"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
          utube-shorts-jp
        </div>
        <NavLink href="/dashboard">홈</NavLink>
        <NavLink href="/dashboard/channels">채널</NavLink>
        <NavLink href="/dashboard/billing">결제</NavLink>
        <div className="mt-auto pt-4 text-xs break-all" style={{ color: "var(--muted)" }}>
          {user?.email ?? "anonymous"}
        </div>
      </aside>

      <section className="flex-1 p-4 md:p-8 min-w-0 flex flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </section>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
    >
      {children}
    </Link>
  );
}
