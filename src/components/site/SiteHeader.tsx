import Link from "next/link";
import { PaletteButton } from "./CommandPalette";
import { Logo } from "./Logo";
import { NavLink, TabBar } from "./Nav";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/gsoc", label: "GSoC" },
  { href: "/issues", label: "First issues" },
  { href: "/guide", label: "Guide" },
];

export function SiteHeader() {
  return (
    <>
      <header className="border-hair bg-bg/75 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="shell flex h-14 items-center justify-between gap-6">
          <Link href="/" aria-label="Contributable home">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-3 sm:gap-6">
            <ul className="hidden items-center gap-6 sm:flex">
              {links.map((link) => (
                <li key={link.href}>
                  <NavLink href={link.href}>{link.label}</NavLink>
                </li>
              ))}
            </ul>
            <PaletteButton />
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <TabBar />
    </>
  );
}
