import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology and limitations",
  description:
    "How RepoInsight reads public GitHub data, calculates its metrics, and what the numbers cannot tell you.",
};

const steps = [
  [
    "Read",
    "Repository metadata, default-branch commits, contributors, releases, issues and pull requests are requested from GitHub's public REST API.",
  ],
  [
    "Calculate",
    "Pure functions turn that data into metrics over trailing 7, 30 and 90 day windows. The same data always produces the same report.",
  ],
  [
    "Show the evidence",
    "Every number carries the inputs it came from, the formula, what it suggests and what it does not prove.",
  ],
];

const rules = [
  [
    "No composite score",
    "Signals are never rolled into one health number. There is no defensible way to weigh them for every project.",
  ],
  [
    "Stated thresholds",
    "A finding such as “concentrated” appears only when a documented threshold is crossed, and the report prints that rule.",
  ],
  [
    "Deterministic",
    "No language model writes any part of a report. Findings come from fixed rules over calculated metrics.",
  ],
  [
    "Honest coverage",
    "Lists are read up to a page limit. When a repository exceeds it, affected windows show a dash rather than a partial number.",
  ],
];

const contributorSignals = [
  [
    "Where to start",
    "Open issues labelled good first issue or help wanted that nobody is assigned to. Finding a first task is the barrier newcomers report most.",
  ],
  [
    "Will it be merged",
    "The share of pull requests from outside the team that were merged rather than closed, and how long merging took.",
  ],
  [
    "Will anyone reply",
    "The median wait for a first reply from another person. Bot comments never count, because bots often reply first.",
  ],
  [
    "Is the process written down",
    "Whether GitHub detects a README, contributing guide, code of conduct, licence and templates.",
  ],
];

const limitations = [
  "Only public data is visible. Private forks, internal trackers and chat never show up.",
  "Commit metrics cover the default branch. Long-lived release branches are not included.",
  "Very active repositories exceed the collection limit; the report states the period it covers.",
  "Authorship follows GitHub attribution. Squash merges and unlinked emails blur who did the work.",
  "Projects that publish through tags or a package registry show no GitHub Releases.",
  "Response times see comments and merges; a pull request answered only by an approving review looks unanswered.",
  "Tone is not measured. Nothing here tells you whether a community is welcoming.",
  "Activity is not quality. A quiet repository can be finished; a busy one can be unstable.",
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-hair grid gap-6 border-t py-12 md:grid-cols-[220px_1fr] md:gap-12">
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <div className="shell pt-16 pb-24 md:pt-24">
      <p className="eyebrow">Methodology</p>
      <h1 className="display mt-5 max-w-3xl text-[clamp(2.4rem,6vw,4.25rem)]">
        Calculated, <em>not generated.</em>
      </h1>
      <p className="text-ink-2 mt-6 mb-14 max-w-2xl text-lg">
        What RepoInsight reads, how it turns that into numbers, and where those numbers
        stop being useful.
      </p>

      <Block title="How it works">
        <ol className="space-y-6">
          {steps.map(([title, body], i) => (
            <li key={title} className="flex gap-5">
              <span className="text-accent pt-1 font-mono text-xs">0{i + 1}</span>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-ink-2 mt-1 max-w-2xl">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Block>

      <Block title="Rules we hold to">
        <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {rules.map(([term, detail]) => (
            <div key={term}>
              <dt className="font-medium">{term}</dt>
              <dd className="text-ink-2 mt-1">{detail}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block title="For contributors">
        <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {contributorSignals.map(([term, detail]) => (
            <div key={term}>
              <dt className="font-medium">{term}</dt>
              <dd className="text-ink-2 mt-1">{detail}</dd>
            </div>
          ))}
        </dl>
        <p className="text-ink-3 mt-8 max-w-2xl text-sm">
          These follow published research on newcomer barriers, pull request abandonment
          and first-response times. Sources are listed in the project README.
        </p>
      </Block>

      <Block title="Limitations">
        <ul className="space-y-3">
          {limitations.map((item) => (
            <li key={item} className="flex gap-4">
              <span
                className="bg-ink-3 mt-[0.7em] size-1 shrink-0 rounded-full"
                aria-hidden="true"
              />
              <p className="max-w-2xl">{item}</p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Privacy">
        <p className="text-ink-2 max-w-2xl">
          RepoInsight retrieves only what GitHub already serves publicly for the
          repository you enter. It stores nothing, sets no cookies and asks for no
          credentials. Each report also documents its own formulas under every metric.
        </p>
        <Link href="/sample" className="btn btn-ghost mt-8">
          See it in the example report →
        </Link>
      </Block>
    </div>
  );
}
