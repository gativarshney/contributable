import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#methodology", label: "Methodology" },
  { href: "/#limitations", label: "Limitations" },
  { href: "/sample", label: "Example report" },
];

export function SiteHeader() {
  return (
    <header className="border-hair bg-bg/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between gap-6">
        <Link href="/" className="font-display text-[22px] leading-none tracking-tight">
          Repo<em className="text-accent">Insight</em>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-6">
          <ul className="hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-ink-2 hover:text-ink text-sm transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
