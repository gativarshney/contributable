"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The main pages, each one click away from anywhere. `paths` lists what else counts as
 * being "in" that page, so the navigation can show where you are.
 */
export const PAGES = [
  {
    href: "/explore",
    label: "Explore",
    short: "Explore",
    paths: ["/explore", "/match", "/compare", "/saved"],
    icon: "M10.5 3a7.5 7.5 0 1 0 4.7 13.3L20 21l1-1-4.7-4.8A7.5 7.5 0 0 0 10.5 3z",
  },
  {
    href: "/gsoc",
    label: "GSoC",
    short: "GSoC",
    paths: ["/gsoc"],
    icon: "M4 20V10h4v10zm6 0V4h4v16zm6 0v-7h4v7z",
  },
  {
    href: "/issues",
    label: "First issues",
    short: "Issues",
    paths: ["/issues"],
    icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
  },
  {
    href: "/check",
    label: "Check a repo",
    short: "Check",
    paths: ["/check", "/repo", "/report", "/sample"],
    icon: "M5 12.5 10 17 19 7",
  },
  {
    href: "/start",
    label: "Start here",
    short: "Start",
    paths: ["/start", "/guide"],
    icon: "M6 4l14 8-14 8z",
  },
] as const;

const under = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

const pageOf = (pathname: string) =>
  PAGES.find((page) => page.paths.some((path) => under(pathname, path)));

/** The main pages, in the header on wide screens. */
export function HeaderNav() {
  const current = pageOf(usePathname());
  return (
    <ul className="border-hair bg-bg-2/60 hidden items-center gap-0.5 rounded-full border p-1 backdrop-blur-xl md:flex">
      {PAGES.map((page) => (
        <li key={page.href}>
          <Link
            href={page.href}
            aria-current={current === page ? "page" : undefined}
            className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm whitespace-nowrap transition-colors duration-200 lg:px-4 ${
              current === page
                ? "bg-bg-3 text-ink shadow-[inset_0_0_0_1px_var(--hair-strong)]"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            {page.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The same pages within thumb reach on a phone. Hidden on wider screens. */
export function TabBar() {
  const current = pageOf(usePathname());
  return (
    <nav aria-label="Main pages" className="tabbar">
      {PAGES.map((page) => {
        const active = page === current;
        return (
          <Link
            key={page.href}
            href={page.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${
              active ? "text-accent" : "text-ink-2"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={page.icon} />
            </svg>
            {page.short}
          </Link>
        );
      })}
    </nav>
  );
}
