"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The site has three sections, one for each thing a visitor comes to do. Each lists
 * the paths that belong to it, so the navigation can show where you are.
 */
export const SECTIONS = [
  {
    href: "/explore",
    label: "Find",
    paths: ["/explore", "/gsoc", "/match", "/compare", "/saved"],
    icon: "M10.5 3a7.5 7.5 0 1 0 4.7 13.3L20 21l1-1-4.7-4.8A7.5 7.5 0 0 0 10.5 3z",
    tabs: [
      { href: "/explore", label: "Repositories" },
      { href: "/gsoc", label: "GSoC organisations" },
      { href: "/match", label: "Help me choose" },
    ],
  },
  {
    href: "/check",
    label: "Check",
    paths: ["/check", "/repo", "/report", "/sample"],
    icon: "M5 12.5 10 17 19 7",
    tabs: [],
  },
  {
    href: "/start",
    label: "Start",
    paths: ["/start", "/issues", "/guide"],
    icon: "M6 4l14 8-14 8z",
    tabs: [
      { href: "/start", label: "Start here" },
      { href: "/issues", label: "First issues" },
      { href: "/guide", label: "How to pick" },
    ],
  },
] as const;

const under = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

const sectionOf = (pathname: string) =>
  SECTIONS.find((section) => section.paths.some((path) => under(pathname, path)));

/** The three sections, in the header on wide screens. */
export function HeaderNav() {
  const current = sectionOf(usePathname());
  return (
    <ul className="hidden items-center gap-7 sm:flex">
      {SECTIONS.map((section) => (
        <li key={section.href}>
          <Link
            href={section.href}
            aria-current={current === section ? "page" : undefined}
            className={`inline-flex min-h-11 items-center border-b-2 text-sm transition-colors ${
              current === section
                ? "border-accent text-ink"
                : "text-ink-2 hover:text-ink border-transparent"
            }`}
          >
            {section.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The pages inside the current section. Shown at the top of each of them. */
export function SectionTabs() {
  const pathname = usePathname();
  const section = sectionOf(pathname);
  if (!section || section.tabs.length === 0) return null;
  return (
    <nav aria-label={`${section.label} pages`} className="border-hair border-b">
      <ul className="shell flex gap-6 overflow-x-auto">
        {section.tabs.map((tab) => {
          const current = under(pathname, tab.href);
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 text-sm whitespace-nowrap transition-colors ${
                  current
                    ? "border-ink text-ink"
                    : "text-ink-3 hover:text-ink border-transparent"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const HOME = { href: "/", label: "Home", icon: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" };

/** Home and the three sections, within thumb reach on a phone. Hidden on wider screens. */
export function TabBar() {
  const pathname = usePathname();
  const current = sectionOf(pathname);
  return (
    <nav aria-label="Main sections" className="tabbar">
      {[HOME, ...SECTIONS].map((item) => {
        const active = item === HOME ? pathname === "/" : item === current;
        return (
          <Link
            key={item.href}
            href={item.href}
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
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
