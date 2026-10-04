import type { Metadata } from "next";
import { PageMark } from "@/components/site/Drift";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Contributable is built by Gati Varshney to help new contributors pick projects that answer them.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="page-glow shell max-w-3xl py-10 md:py-14">
      <div className="flex items-center gap-3">
        <PageMark icon="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
        <p className="eyebrow">About</p>
      </div>
      <h1 className="display mt-3 text-[clamp(2rem,5vw,3.25rem)]">
        Pick the project <em>that answers.</em>
      </h1>
      <div className="mt-8 space-y-5 text-lg">
        <p>
          Most first pull requests fail for a boring reason: nobody replies. New
          contributors pick the most famous project, wait three weeks, and give up.
        </p>
        <p>
          Contributable measures how projects treat people outside their core team, so you
          can choose one that will read your pull request.
        </p>
      </div>

      <section className="border-hair mt-12 border-t pt-10">
        <h2 className="font-display text-2xl">Who built it</h2>
        <p className="text-ink-2 mt-3">
          Gati Varshney, a final-year B.Tech Computer Science student and{" "}
          <a
            href="https://summerofcode.withgoogle.com/programs/2026/projects/k0bZOR1y"
            className="link"
            target="_blank"
            rel="noreferrer"
          >
            Google Summer of Code 2026 contributor
          </a>{" "}
          with The Linux Foundation.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2 text-sm">
          {[
            ["GitHub", "https://github.com/gativarshney"],
            ["LinkedIn", "https://www.linkedin.com/in/gativarshney/"],
            ["Portfolio", "https://gativarshney.github.io/"],
          ].map(([label, href]) => (
            <li key={label}>
              <a href={href} className="btn btn-ghost" target="_blank" rel="noreferrer">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-hair mt-12 border-t pt-10">
        <h2 className="font-display text-2xl">What it promises</h2>
        <ul className="text-ink-2 mt-4 space-y-3">
          <li>Free for everyone. Nothing here needs an account.</li>
          <li>
            No hidden score. Every ranking states its rule, and every number links to the
            pull requests behind it.
          </li>
          <li>
            No individual is measured. Figures describe a repository, never a maintainer.
          </li>
          <li>
            Maintainers can ask for a repository to be left out by{" "}
            <a
              href="https://github.com/gativarshney/contributable/issues/new?template=opt_out.md"
              className="link"
              target="_blank"
              rel="noreferrer"
            >
              opening an opt-out request
            </a>
            .
          </li>
        </ul>
        <p className="text-ink-2 mt-6">
          The code is open source under the MIT licence. Contributable is independent and
          is not affiliated with GitHub or Google. Read{" "}
          <Link href="/methodology" className="link">
            how every figure is calculated
          </Link>{" "}
          or check{" "}
          <Link href="/status" className="link">
            how fresh the data is
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
