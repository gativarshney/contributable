import type { Metadata } from "next";
import Link from "next/link";
import { FourThings, famousPair } from "@/components/home/Story";
import { RepoInput } from "@/components/site/RepoInput";
import { getIndex } from "@/lib/data";
import { firstReply, percent } from "@/lib/format";

export const metadata: Metadata = {
  title: "Check any repository",
  description:
    "Paste any public GitHub repository and see what to expect before your first pull request: where to start, who replies, and whether outside work gets merged.",
  alternates: { canonical: "/check" },
};

const EXAMPLES = [
  "vercel/next.js",
  "fastify/fastify",
  "sindresorhus/ky",
  "OpenPrinting/cups",
];

export const revalidate = 900;

export default async function CheckPage() {
  const index = await getIndex();
  // The same real repository the "four things" below are shown for.
  const example = famousPair(index.rows)?.fast;
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />
        <div className="shell relative grid grid-cols-[minmax(0,1fr)] items-center gap-12 pt-[clamp(2.5rem,9svh,7rem)] pb-16 md:pb-24 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div>
            <p className="eyebrow">Check any repository</p>
            <h1 className="display mt-6 text-[clamp(2.4rem,min(6vw,9svh),4.25rem)]">
              Know a repository <em>before your first pull request.</em>
            </h1>
            <p className="text-ink-2 mt-6 max-w-xl text-lg">
              Paste any public GitHub repository, from a Google Summer of Code
              organisation or not. It is read and measured while you wait.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2 text-sm">
              {["Any public repository", "GSoC or not", "No sign-in"].map((item) => (
                <li
                  key={item}
                  className="border-hair-strong text-ink-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="text-accent size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12.5 10 17 19 7.5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-9 max-w-xl">
              <RepoInput />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-ink-3 mr-1 text-sm">Try</span>
                {EXAMPLES.map((repo) => (
                  <Link
                    key={repo}
                    href={`/repo/${repo}`}
                    className="border-hair-strong text-ink-2 hover:text-ink hover:border-ink-3 inline-flex min-h-8 items-center rounded-full border px-3 font-mono text-xs transition-colors"
                  >
                    {repo}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {example ? (
            <Link
              href={`/repo/${example.id}`}
              className="card hero-glow-card group hover:border-accent/40 relative block p-6 transition-colors md:p-7"
              aria-label={`See the full report for ${example.id}`}
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://github.com/${example.id.split("/")[0]}.png?size=88`}
                  alt=""
                  width={44}
                  height={44}
                  referrerPolicy="no-referrer"
                  className="border-hair bg-bg-3 size-11 rounded-xl border"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-ink-3 text-xs">A real report</p>
                  <p className="truncate font-medium">{example.id}</p>
                </div>
                <span className="border-accent/40 bg-accent-soft/40 text-accent rounded-full border px-2.5 py-0.5 text-xs">
                  Measured
                </span>
              </div>
              <ul className="mt-6 space-y-3">
                {(
                  [
                    [
                      "First human reply",
                      firstReply(example.replyHours, example.replyN),
                      `median of ${example.replyN} outside PRs`,
                      example.replyHours !== null && example.replyHours <= 72,
                    ],
                    [
                      "Outside PRs merged",
                      percent(example.mergeRate),
                      `of ${example.decided} decided`,
                      (example.mergeRate ?? 0) >= 0.5,
                    ],
                    [
                      "Free first issues",
                      String(example.available),
                      "open, unassigned, unclaimed",
                      example.available > 0,
                    ],
                    [
                      "Contributing guide",
                      example.guide ? "Yes" : "No",
                      example.guide
                        ? "setup and rules written down"
                        : "the README explains setup",
                      example.guide,
                    ],
                  ] as const satisfies readonly (readonly [
                    string,
                    string,
                    string,
                    boolean,
                  ])[]
                ).map(([label, value, note, good], i) => (
                  <li
                    key={label}
                    className="rise border-hair bg-bg/40 flex items-center gap-4 rounded-xl border px-4 py-3"
                    style={{ animationDelay: `${200 + i * 140}ms` }}
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full ${good ? "bg-accent text-accent-ink" : "border-hair-strong text-ink-3 border"}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d={good ? "M5 12.5 10 17 19 7.5" : "M7 12h10"} />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{label}</span>
                      <span className="text-ink-3 block text-xs">{note}</span>
                    </span>
                    <span
                      className={`num text-lg font-medium ${good ? "text-accent" : "text-ink-2"}`}
                    >
                      {value}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-ink-2 group-hover:text-ink mt-5 text-sm transition-colors">
                See the full report <span aria-hidden="true">→</span>
              </p>
            </Link>
          ) : null}
        </div>
      </section>

      <FourThings rows={index.rows} />

      <section className="pb-20 md:pb-28">
        <div className="shell">
          <div className="flex flex-wrap gap-3">
            <Link href="/repo/OpenPrinting/cups" className="btn btn-ghost">
              See an example report
            </Link>
            <Link href="/methodology" className="btn btn-ghost">
              How every figure is calculated
            </Link>
          </div>
          <p className="text-ink-3 mt-6 text-sm">
            Public data only. No account, nothing stored. A repository already in the
            index opens at once; any other takes about ten seconds.
          </p>
        </div>
      </section>
    </>
  );
}
