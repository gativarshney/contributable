import type { Metadata } from "next";
import { GsocMark } from "@/components/data/GsocMark";
import { PageMark } from "@/components/site/Drift";
import Link from "next/link";
import { getAvailableIssues, getIndex } from "@/lib/data";
import { count } from "@/lib/format";
import { GSOC_ORGS } from "@/lib/gsoc/orgs";

export const metadata: Metadata = {
  title: "About",
  description:
    "Contributable is built by Gati Varshney to help new contributors pick projects that answer them.",
  alternates: { canonical: "/about" },
};

export const revalidate = 900;

export default async function AboutPage() {
  const [index, issues] = await Promise.all([getIndex(), getAvailableIssues()]);
  const numbers: [value: number, label: string, icon: string][] = [
    [index.rows.length, "repositories measured", "M4 20V10m6 10V4m6 16v-7m4 7H2"],
    [
      GSOC_ORGS.length,
      "GSoC organisations",
      "M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z",
    ],
    [
      issues.filter((i) => i.label === "beginner").length,
      "free first issues",
      "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    ],
    [
      new Set(index.rows.flatMap((r) => r.lang)).size,
      "languages",
      "m8 8-4 4 4 4m8-8 4 4-4 4",
    ],
  ];

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

      <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {numbers.map(([value, label, icon]) => (
          <li key={label} className="card p-4">
            <span className="text-accent">
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={icon} />
              </svg>
            </span>
            <p className="num mt-3 text-3xl leading-none font-medium tracking-tight">
              {count(value)}
            </p>
            <p className="text-ink-2 mt-1.5 text-xs">{label}</p>
          </li>
        ))}
      </ul>

      <section
        aria-labelledby="who"
        className="card hero-glow-card mt-12 overflow-hidden p-6 md:p-8"
      >
        <p id="who" className="eyebrow !text-accent">
          Who built it
        </p>
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://github.com/gativarshney.png?size=240"
            loading="lazy"
            alt="Gati Varshney"
            width={112}
            height={112}
            className="size-28 shrink-0 rounded-full object-cover shadow-[0_0_0_4px_var(--bg),0_0_0_6px_var(--accent)]"
          />
          <div>
            <h2 className="display text-[clamp(2rem,5vw,2.75rem)]">
              Gati <em>Varshney</em>
            </h2>
            <p className="text-ink-2 mt-2 text-lg">
              Final-year B.Tech Computer Science student.
            </p>
            <a
              href="https://summerofcode.withgoogle.com/programs/2026/projects/k0bZOR1y"
              target="_blank"
              rel="noreferrer"
              className="border-hair-strong bg-bg/50 hover:border-accent mt-4 inline-flex items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-1.5 text-sm transition-colors"
            >
              <GsocMark size={26} />
              <span>
                <span className="font-medium">
                  Google Summer of Code 2026 contributor
                </span>
                <span className="text-ink-2"> · The Linux Foundation</span>
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <p className="text-ink-2 border-hair mt-8 max-w-2xl border-t pt-6">
          I built Contributable after seeing how often a first pull request goes
          unanswered. It is the tool I wanted when choosing where to contribute.
        </p>

        <ul className="mt-6 flex flex-wrap gap-3">
          {[
            [
              "GitHub",
              "https://github.com/gativarshney",
              "M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-1.95c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.16 1.18a11 11 0 0 1 5.76 0c2.19-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z",
            ],
            [
              "LinkedIn",
              "https://www.linkedin.com/in/gativarshney/",
              "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
            ],
            [
              "Portfolio",
              "https://gativarshney.github.io/",
              "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96ZM4.26 14a8.2 8.2 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4H4.26Zm5.4 0a14.7 14.7 0 0 1 0-4h4.68a14.7 14.7 0 0 1 0 4H9.66Zm6.7 0a16.5 16.5 0 0 0 0-4h3.38a8.2 8.2 0 0 1 0 4h-3.38Z",
            ],
          ].map(([label, href, icon]) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="border-accent/60 bg-accent-soft/40 text-accent hover:bg-accent hover:text-accent-ink inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d={icon} />
                </svg>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-hair mt-12 border-t pt-10">
        <h2 className="font-display text-2xl">What it promises</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {(
            [
              [
                "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
                "Free, no account",
                <>Everything here works without signing up.</>,
              ],
              [
                "M4 6h16M4 12h10M4 18h6",
                "No hidden score",
                <>
                  Every ranking states its rule, and every number links to the pull
                  requests behind it.
                </>,
              ],
              [
                "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-3.5 3.5-6 8-6s8 2.5 8 6M3 3l18 18",
                "No one is measured",
                <>Figures describe a repository, never an individual maintainer.</>,
              ],
              [
                "M5 12h14M12 5l7 7-7 7",
                "Maintainers can opt out",
                <>
                  Ask for a repository to be left out by{" "}
                  <a
                    href="https://github.com/gativarshney/contributable/issues/new?template=opt_out.md"
                    className="link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    opening a request
                  </a>
                  .
                </>,
              ],
            ] as const
          ).map(([icon, title, text]) => (
            <li key={title} className="card flex gap-4 p-5">
              <span className="border-accent/40 bg-accent-soft/40 text-accent grid size-10 shrink-0 place-items-center rounded-full border">
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={icon} />
                </svg>
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-ink-2 mt-1 text-sm">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-ink-3 border-hair mt-8 border-t pt-6 text-sm">
          The code is open source under the GNU AGPL-3.0: copies that are run as a website
          must publish their source and keep the author credit. Contributable is
          independent and is not affiliated with GitHub or Google. Read{" "}
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
