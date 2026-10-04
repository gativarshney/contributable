"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const isCurrent = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

/** A header link that knows when it is the page you are on. */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const current = isCurrent(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex min-h-11 items-center border-b-2 text-sm transition-colors ${
        current
          ? "border-accent text-ink"
          : "text-ink-2 hover:text-ink border-transparent"
      }`}
    >
      {children}
    </Link>
  );
}

const TABS = [
  { href: "/", label: "Home", icon: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" },
  {
    href: "/explore",
    label: "Explore",
    icon: "M10.5 3a7.5 7.5 0 1 0 4.7 13.3L20 21l1-1-4.7-4.8A7.5 7.5 0 0 0 10.5 3z",
  },
  {
    href: "/issues",
    label: "Issues",
    icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
  },
  { href: "/gsoc", label: "GSoC", icon: "M4 20V10h4v10zm6 0V4h4v16zm6 0v-7h4v7z" },
];

/** The four main places, within thumb reach on a phone. Hidden on wider screens. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main sections" className="tabbar">
      {TABS.map((tab) => {
        const current = isCurrent(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
              current ? "text-accent" : "text-ink-2"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={tab.icon} />
            </svg>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
