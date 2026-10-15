import Link from "next/link";
import { Logo } from "./Logo";
import { Menu } from "./Menu";
import { HeaderNav, TabBar } from "./Nav";
import { SavedLink } from "./Saved";
import { GitHubMark } from "./GitHubMark";
import { REPO_URL } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <>
      <header className="header-fade sticky top-0 z-40">
        {/* Wider than the page shell, so the whole bar fits. Three columns: name, the
            menu, actions; on wide screens the outer two match, so the menu sits in the
            true centre of the page. */}
        <div className="mx-auto grid h-16 w-full max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:gap-4 sm:px-6 xl:grid-cols-[1fr_auto_1fr] 2xl:px-8">
          {/* The site's name first; its maker signs beside it, where there is room. */}
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/" aria-label="Contributable home">
              <Logo large />
            </Link>
            <Link
              href="/about"
              className="group hidden items-center gap-3 text-[13px] whitespace-nowrap xl:inline-flex"
            >
              <span className="bg-hair-strong h-4 w-px" aria-hidden="true" />
              <span>
                <span className="text-ink-3">by </span>
                <span className="text-accent font-semibold transition-opacity group-hover:opacity-80">
                  Gati Varshney
                </span>
              </span>
            </Link>
          </div>
          <nav aria-label="Primary" className="contents">
            <HeaderNav />
            <div className="flex items-center gap-1.5 justify-self-end sm:gap-2">
              <SavedLink />
              <ThemeToggle />
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Star Contributable on GitHub"
                title="Star on GitHub"
                // Phones have the toast, the home card and the footer; the bar is full.
                // The search button is gone from the bar (Ctrl K and the Menu still open
                // it), which leaves room for a proper GitHub button.
                className="border-hair-strong bg-bg-2/70 text-ink hover:border-accent/70 hover:bg-accent-soft/40 hidden h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors sm:inline-flex"
              >
                <GitHubMark className="size-[17px]" />
                <span>
                  Star<span className="hidden 2xl:inline"> on GitHub</span>
                </span>
              </a>
              <Menu />
            </div>
          </nav>
        </div>
      </header>
      <TabBar />
    </>
  );
}
