import Link from "next/link";
import { PaletteButton } from "./CommandPalette";
import { Logo } from "./Logo";
import { Menu } from "./Menu";
import { HeaderNav, TabBar } from "./Nav";
import { SavedLink } from "./Saved";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <>
      <header className="header-fade sticky top-0 z-40">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Contributable home">
              <Logo />
            </Link>
            <Link
              href="/about"
              className="text-ink-3 hover:text-ink border-hair hidden border-l pl-3 text-xs transition-colors xl:inline"
            >
              by Gati Varshney
            </Link>
          </div>
          <nav aria-label="Primary" className="contents">
            <HeaderNav />
            <div className="flex items-center gap-2">
              <PaletteButton />
              <SavedLink />
              <ThemeToggle />
              <Menu />
            </div>
          </nav>
        </div>
      </header>
      <TabBar />
    </>
  );
}
