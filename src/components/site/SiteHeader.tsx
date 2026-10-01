import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/sample", label: "Example" },
  { href: "/methodology", label: "How it works" },
];

export function SiteHeader() {
  return (
    <header className="border-hair bg-bg/75 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="shell flex h-14 items-center justify-between gap-6">
        <Link href="/" aria-label="RepoInsight home">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5">
          <ul className="flex items-center gap-5">
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
