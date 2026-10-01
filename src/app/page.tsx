import Link from "next/link";
import { RepoInput } from "@/components/site/RepoInput";

const examples = ["vercel/next.js", "facebook/react", "sindresorhus/ky"];

const steps = [
  {
    title: "Read",
    body: "RepoInsight requests repository metadata, commits, contributors, releases, issues and pull requests from GitHub's public REST API.",
  },
  {
    title: "Calculate",
    body: "Pure, deterministic functions turn that data into metrics over 7, 30 and 90 day windows. The same data always produces the same report.",
  },
  {
    title: "Show the evidence",
    body: "Every number carries the inputs it was calculated from, the formula, what it suggests and what it does not prove.",
  },
];

const layers = [
  {
    label: "Observed fact",
    example: "183 commits reached the default branch in the last 30 days.",
    note: "Read directly from GitHub.",
  },
  {
    label: "Calculated metric",
    example: "Top contributor share: 68% (124 of 183 commits).",
    note: "Derived with a documented formula.",
  },
  {
    label: "Interpretation",
    example: "Contribution activity is concentrated around one contributor.",
    note: "A description, with its threshold stated.",
  },
  {
    label: "Limitation",
    example: "This is a concentration signal, not proof of project risk.",
    note: "What the number cannot tell you.",
  },
];

const signals = [
  ["Activity", "Commits per window, active days, daily trend, quiet periods."],
  ["Maintenance", "Time since the last push, commit, release, merge and closed issue."],
  ["Contributors", "Who authored recent commits and how concentrated that work is."],
  ["Releases", "Latest release, cadence between releases, a twelve month timeline."],
  ["Issues", "Opened and closed per window, net change, time to close."],
  ["Pull requests", "Opened, merged and closed without merge, time to merge."],
];

const methodology = [
  [
    "Windows",
    "Metrics are reported over the trailing 7, 30 and 90 days, measured from the moment the data was fetched.",
  ],
  [
    "No composite score",
    "RepoInsight never rolls signals into a single health number. A score hides the trade-offs; the individual measurements do not.",
  ],
  [
    "Stated thresholds",
    "A finding such as “concentrated” appears only when a documented threshold is crossed, and the report shows that threshold.",
  ],
  [
    "Deterministic",
    "No language model writes any part of a report. Findings are produced by rules over the calculated metrics.",
  ],
];

const limitations = [
  "Only public data is visible. Work in private forks, internal trackers or chat never shows up.",
  "Commit counts cover the default branch. Long-lived release branches are not included.",
  "Very active repositories exceed the collection limit; the report then states the period it actually covers.",
  "Commits are attributed by GitHub account. Squash merges and unlinked emails blur who did the work.",
  "Activity is not quality. A quiet repository can be finished; a busy one can be unstable.",
];

function SectionHeading({
  index,
  label,
  title,
  children,
}: {
  index: string;
  label: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-end md:gap-16">
      <div>
        <p className="eyebrow">
          {index} — {label}
        </p>
        <h2 className="display mt-5 text-[clamp(2.4rem,5.5vw,4rem)]">{title}</h2>
      </div>
      {children ? <p className="text-ink-2 max-w-md md:pb-2">{children}</p> : null}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="shell pt-16 pb-20 md:pt-28 md:pb-28">
        <p className="eyebrow rise flex items-center gap-3">
          <span
            className="bg-accent inline-block size-1.5 rounded-full"
            aria-hidden="true"
          />
          Evidence-backed repository reports
        </p>
        <h1
          className="display rise mt-7 max-w-4xl text-[clamp(2.9rem,8vw,6rem)]"
          style={{ animationDelay: "60ms" }}
        >
          Understand a GitHub repository <em>before you depend on it.</em>
        </h1>
        <p
          className="text-ink-2 rise mt-8 max-w-2xl text-lg"
          style={{ animationDelay: "120ms" }}
        >
          RepoInsight turns public GitHub activity into an evidence-backed engineering
          report — helping you understand maintenance, collaboration, releases, activity,
          and other observable project signals at a glance.
        </p>
        <div className="rise mt-10 max-w-2xl" style={{ animationDelay: "180ms" }}>
          <RepoInput />
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="eyebrow !text-ink-3 mr-1">Try</span>
            {examples.map((repo) => (
              <Link
                key={repo}
                href={`/report/${repo}`}
                className="chip hover:border-ink-2 hover:text-ink !normal-case transition-colors"
              >
                {repo}
              </Link>
            ))}
            <Link href="/sample" className="link text-ink-2 ml-1 text-sm">
              or read the example report
            </Link>
          </div>
        </div>
        <dl className="border-hair mt-16 grid border-t sm:grid-cols-3">
          {[
            ["No sign-in", "Public repositories only. No token, no account."],
            ["No score", "Measurements with their evidence, not a grade."],
            ["No guessing", "Deterministic analysis. No generated text."],
          ].map(([term, detail]) => (
            <div
              key={term}
              className="border-hair border-b py-6 sm:border-r sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:border-r-0"
            >
              <dt className="eyebrow !text-accent">{term}</dt>
              <dd className="text-ink-2 mt-2 text-sm">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="how-it-works" className="border-hair border-t py-20 md:py-28">
        <div className="shell">
          <SectionHeading
            index="01"
            label="How it works"
            title={
              <>
                Data in, <em>evidence out.</em>
              </>
            }
          >
            Three steps, all of them inspectable. Nothing in a report comes from anywhere
            other than GitHub&rsquo;s public API.
          </SectionHeading>
          <ol className="border-hair mt-14 grid border-t md:grid-cols-3">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="border-hair border-b py-8 md:border-r md:border-b-0 md:px-8 md:first:pl-0 md:last:border-r-0"
              >
                <span className="text-accent font-mono text-xs">0{i + 1}</span>
                <h3 className="font-display mt-3 text-3xl">{step.title}</h3>
                <p className="text-ink-2 mt-3 text-[15px]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-hair border-t py-20 md:py-28">
        <div className="shell">
          <SectionHeading
            index="02"
            label="Evidence first"
            title={
              <>
                Four layers, <em>never blurred.</em>
              </>
            }
          >
            A fact, a metric, an interpretation and a limitation are different kinds of
            statement. A report keeps them visibly apart.
          </SectionHeading>
          <div className="border-hair mt-14 border-t">
            {layers.map((layer) => (
              <div
                key={layer.label}
                className="border-hair grid gap-2 border-b py-6 md:grid-cols-[220px_1fr_260px] md:gap-8"
              >
                <p className="eyebrow !text-accent pt-1">{layer.label}</p>
                <p className="font-display text-2xl leading-snug">{layer.example}</p>
                <p className="text-ink-2 text-sm md:pt-1.5">{layer.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-hair border-t py-20 md:py-28">
        <div className="shell">
          <SectionHeading
            index="03"
            label="What a report covers"
            title={
              <>
                Six signals, <em>one read.</em>
              </>
            }
          >
            The questions you would otherwise answer by clicking through a dozen GitHub
            tabs.
          </SectionHeading>
          <ul className="bg-hair border-hair mt-14 grid gap-px border sm:grid-cols-2 lg:grid-cols-3">
            {signals.map(([name, detail], i) => (
              <li key={name} className="bg-bg p-7">
                <span className="text-ink-3 font-mono text-xs">0{i + 1}</span>
                <h3 className="font-display mt-2 text-2xl">{name}</h3>
                <p className="text-ink-2 mt-2 text-sm">{detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="methodology" className="border-hair border-t py-20 md:py-28">
        <div className="shell">
          <SectionHeading
            index="04"
            label="Methodology"
            title={
              <>
                Calculated, <em>not generated.</em>
              </>
            }
          >
            Each report documents its own formulas. These are the rules that hold across
            all of them.
          </SectionHeading>
          <dl className="mt-14 grid gap-x-16 gap-y-10 md:grid-cols-2">
            {methodology.map(([term, detail]) => (
              <div key={term} className="border-hair border-t pt-5">
                <dt className="font-display text-2xl">{term}</dt>
                <dd className="text-ink-2 mt-2 text-[15px]">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="limitations" className="border-hair border-t py-20 md:py-28">
        <div className="shell">
          <SectionHeading
            index="05"
            label="Limitations"
            title={
              <>
                What this <em>cannot tell you.</em>
              </>
            }
          >
            Public GitHub data is a partial view of a project. RepoInsight is a starting
            point for your own judgement, not a substitute for it.
          </SectionHeading>
          <ul className="border-hair mt-14 border-t">
            {limitations.map((item, i) => (
              <li key={item} className="border-hair flex gap-6 border-b py-5">
                <span className="text-ink-3 pt-0.5 font-mono text-xs">0{i + 1}</span>
                <p className="max-w-3xl">{item}</p>
              </li>
            ))}
          </ul>
          <p className="text-ink-2 mt-8 max-w-2xl text-sm">
            RepoInsight retrieves only what GitHub already serves publicly for the
            repository you enter. It stores nothing, sets no cookies and asks for no
            credentials.
          </p>
        </div>
      </section>

      <section className="border-hair border-t py-20 md:py-28">
        <div className="shell">
          <h2 className="display max-w-3xl text-[clamp(2.4rem,5.5vw,4rem)]">
            Start with <em>a repository.</em>
          </h2>
          <div className="mt-10 max-w-2xl">
            <RepoInput />
          </div>
        </div>
      </section>
    </>
  );
}
