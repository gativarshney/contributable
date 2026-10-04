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
          <Link href="/" aria-label="Contributable home">
            <Logo />
          </Link>
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
