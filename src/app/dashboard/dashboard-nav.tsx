"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Home", exact: true },
  { href: "/dashboard/cruises", label: "Cruises", exact: false },
  { href: "/dashboard/settings", label: "Settings", exact: false },
];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  // "/dashboard/cruises" is active for itself and everything beneath it,
  // but "/dashboard/cruisesX" would not match.
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex items-center gap-4 text-sm">
      {links.map((link) => {
        const active = isActive(pathname, link.href, link.exact);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "font-medium underline underline-offset-4"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}