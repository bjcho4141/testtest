import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
    <div className="min-h-screen flex">
      <aside
        className="w-60 border-r p-4 flex flex-col gap-2"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
          utube-shorts-jp
        </div>
        <NavLink href="/dashboard">홈</NavLink>
        <NavLink href="/dashboard/billing">결제</NavLink>
        <div className="mt-auto pt-4 text-xs" style={{ color: "var(--muted)" }}>
          {user?.email ?? "anonymous"}
        </div>
      </aside>
      <section className="flex-1 p-8">{children}</section>
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
