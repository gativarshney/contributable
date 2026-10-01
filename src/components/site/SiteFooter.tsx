import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-hair border-t">
      <div className="shell flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="text-ink-3 text-sm">
            Built by Gati Varshney. Not affiliated with GitHub.
          </p>
        </div>
        <nav aria-label="Footer" className="text-ink-2 flex gap-6 text-sm">
          <Link href="/sample" className="hover:text-ink transition-colors">
            Example
          </Link>
          <Link href="/methodology" className="hover:text-ink transition-colors">
            Methodology
          </Link>
          <a
            href="https://github.com/gativarshney/repoinsight"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink transition-colors"
          >
            Source
          </a>
        </nav>
      </div>
    </footer>
  );
}
