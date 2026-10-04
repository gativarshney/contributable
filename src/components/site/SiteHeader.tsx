import Link from "next/link";
import { PaletteButton } from "./CommandPalette";
import { Logo } from "./Logo";
import { HeaderNav, SectionTabs, TabBar } from "./Nav";
import { SavedLink } from "./Saved";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <>
      <header className="border-hair bg-bg/75 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="shell flex h-14 items-center justify-between gap-6">
          <Link href="/" aria-label="Contributable home">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-3 sm:gap-7">
            <HeaderNav />
            <div className="flex items-center gap-2">
              <PaletteButton />
              <SavedLink />
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </header>
      <SectionTabs />
      <TabBar />
    </>
  );
}
