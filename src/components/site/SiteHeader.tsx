import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/gsoc", label: "GSoC" },
  { href: "/issues", label: "Issues" },
  { href: "/methodology", label: "Method", wide: true },
];

export function SiteHeader() {
  return (
    <header className="border-hair bg-bg/75 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="shell flex h-14 items-center justify-between gap-6">
        <Link href="/" aria-label="Contributable home">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-3 sm:gap-5">
          <ul className="flex items-center gap-3.5 sm:gap-5">
            {links.map((link) => (
              <li key={link.href} className={link.wide ? "hidden sm:block" : undefined}>
                <Link
                  href={link.href}
                  className="text-ink-2 hover:text-ink inline-flex min-h-11 items-center text-sm transition-colors"
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
