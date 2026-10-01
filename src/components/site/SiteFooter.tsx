import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-hair mt-24 border-t">
      <div className="shell flex flex-col gap-8 py-12 md:flex-row md:items-end md:justify-between">
        <div className="max-w-md">
          <p className="font-display text-2xl leading-none">
            Repo<em className="text-accent">Insight</em>
          </p>
          <p className="text-ink-2 mt-3 text-sm">
            Evidence-backed engineering reports for public GitHub repositories. No
            sign-in, no tracking, nothing stored.
          </p>
        </div>
        <div className="eyebrow flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/#methodology" className="hover:text-ink transition-colors">
            Methodology
          </Link>
          <Link href="/#limitations" className="hover:text-ink transition-colors">
            Limitations
          </Link>
          <a
            href="https://github.com/gativarshney/repoinsight"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink transition-colors"
          >
            Source ↗
          </a>
        </div>
      </div>
      <div className="shell border-hair border-t py-5">
        <p className="eyebrow !text-ink-3">
          Built by Gati Varshney · Not affiliated with GitHub
        </p>
      </div>
    </footer>
  );
}
