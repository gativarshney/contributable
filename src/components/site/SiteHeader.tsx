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
          {/* The site's name first; its maker signs beside it, where there is room. */}
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/" aria-label="Contributable home">
              <Logo large />
            </Link>
            <Link
              href="/about"
              className="group hidden items-center gap-3 text-[13px] whitespace-nowrap sm:inline-flex lg:hidden xl:inline-flex"
            >
              <span className="bg-hair-strong h-4 w-px" aria-hidden="true" />
              <span>
                <span className="text-ink-3">by </span>
                <span className="text-ink-2 group-hover:text-ink font-medium transition-colors">
                  Gati Varshney
                </span>
              </span>
            </Link>
          </div>
          <nav aria-label="Primary" className="contents">
            <HeaderNav />
            <div className="flex items-center gap-1.5 sm:gap-2">
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
