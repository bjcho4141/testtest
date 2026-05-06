"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`text-sm px-3 py-2 rounded-md transition relative ${
        isActive
          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold"
          : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
