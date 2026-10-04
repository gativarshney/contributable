import type { Metadata } from "next";
import { Drift, DriftPill, PageMark } from "@/components/site/Drift";
import Link from "next/link";
import type { IndexRow } from "@/core/published";
import { getIndex } from "@/lib/data";
import { compact, date, firstReply, percent } from "@/lib/format";

export const metadata: Metadata = {
  title: "How to pick an organisation",
  description:
    "One rule for choosing an open source project or GSoC organisation: pick the one that answers newcomers, not the most famous one. With a checklist and real examples.",
  alternates: { canonical: "/guide" },
};

export const revalidate = 3600;

/** Enough outside pull requests that the figures are not luck. */
const SOLID_SAMPLE = 20;

function examples(rows: IndexRow[]) {
  const solid = rows.filter((r) => r.replyN >= SOLID_SAMPLE && r.within48h !== null);
  const famous = [...solid].sort((a, b) => b.stars - a.stars)[0] ?? null;
  const responsive =
    [...solid]
      .filter((r) => r.id !== famous?.id && r.mergeRate !== null)
      .sort((a, b) => b.within48h! - a.within48h! || b.mergeRate! - a.mergeRate!)[0] ??
    null;
  return { famous, responsive, solid: solid.length };
}

function Example({ title, row }: { title: string; row: IndexRow }) {
  return (
    <div className="card p-5">
      <p className="eyebrow">{title}</p>
      <p className="mt-2 font-medium">
        <Link href={`/repo/${row.id}`} className="link">
          {row.id}
        </Link>
      </p>
      <dl className="num mt-4 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-ink-2">Stars</dt>
        <dd className="text-right">{compact(row.stars)}</dd>
        <dt className="text-ink-2">Reply within 48 h</dt>
        <dd className="text-right">{percent(row.within48h)}</dd>
        <dt className="text-ink-2">Median first reply</dt>
        <dd className="text-right">{firstReply(row.replyHours, row.replyN)}</dd>
        <dt className="text-ink-2">Outside PRs merged</dt>
        <dd className="text-right">
          {row.mergeRate === null ? "n/a" : percent(row.mergeRate)}
        </dd>
        <dt className="text-ink-2">Outside PRs measured</dt>
        <dd className="text-right">{row.replyN}</dd>
      </dl>
    </div>
  );
}

const CHECKLIST = [
  [
    "Does a person reply within a week?",
    "Look at first reply time and the share answered within 7 days. A bot comment does not count.",
  ],
  [
    "Are outside pull requests merged?",
    "Outside merge rate of the last four months. Check the first-time contributor figure too.",
  ],
  [
    "Is there something to start on today?",
    "Available starter issues: open, unassigned, unclaimed, no pull request yet.",
  ],
  [
    "Is the way in written down?",
    "A contributing guide, and whether you must sign a CLA or sign off commits.",
  ],
  [
    "Is anyone there right now?",
    "Commits in the last 90 days, and a trend that has not gone quiet.",
  ],
  [
    "Can you talk to them?",
    "A chat or mailing list, and reply hours that overlap your day.",
  ],
];

const READING = [
  [
    "First reply time",
    "The median wait for a human reply on pull requests from outside the team. Unanswered pull requests count as still waiting, so ignoring people makes the figure worse, not better.",
  ],
  [
    "Outside merge rate",
    "Merged divided by merged plus closed-without-merge. Pull requests still open are shown separately, because nobody knows yet how they end.",
  ],
  [
    "Sample size",
    "Every figure says how many pull requests it rests on. Under 5 there is no figure at all. Between 5 and 20, treat it as a hint.",
  ],
  [
    "Starter issue states",
    "A label is not availability. An issue with a claim comment or a linked pull request is taken, whatever its label says.",
  ],
];

export default async function GuidePage() {
  const index = await getIndex();
  const { famous, responsive, solid } = examples(index.rows);

  return (
    <article className="page-glow shell max-w-3xl py-10 md:py-14">
      <div className="flex items-center gap-3">
        <PageMark icon="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" />
        <p className="eyebrow">Guide</p>
      </div>
      <h1 className="display mt-3 text-[clamp(2rem,5vw,3.25rem)]">
        How to pick <em>an organisation.</em>
      </h1>
      <p className="mt-8 text-[clamp(1.25rem,2.6vw,1.6rem)] leading-snug font-medium tracking-tight">
        One rule: pick the project that answers newcomers, not the most famous one.
      </p>
      <p className="text-ink-2 mt-4">
        A famous project gets hundreds of pull requests from strangers. Its maintainers
        cannot read them all, and yours waits in the pile. A smaller project that replies
        in a day teaches you more in a month than a famous one does in a year.
      </p>

      <div className="mt-10">
        <Drift
          seconds={80}
          items={CHECKLIST.map(([question], i) => (
            <DriftPill key={question} accent={i === 0}>
              {question}
            </DriftPill>
          ))}
        />
      </div>

      {famous && responsive ? (
        <section className="border-hair mt-12 border-t pt-10">
          <h2 className="font-display text-2xl">From the data</h2>
          <p className="text-ink-2 mt-2 text-sm">
            Among the {solid} repositories with at least {SOLID_SAMPLE} outside pull
            requests: the one with the most stars, next to the one that answers the
            largest share within 48 hours. Updated {date(index.generatedAt)}.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Example title="Most stars" row={famous} />
            <Example title="Answers the most" row={responsive} />
          </div>
        </section>
      ) : null}

      <section className="border-hair mt-12 border-t pt-10">
        <h2 className="font-display text-2xl">The checklist</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2">
          {CHECKLIST.map(([question, how], i) => (
            <li key={question} className="card flex gap-4 p-5">
              <span className="bg-accent-soft text-accent num grid size-8 shrink-0 place-items-center rounded-full text-sm font-medium">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{question}</p>
                <p className="text-ink-2 mt-1 text-sm">{how}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-hair mt-12 border-t pt-10">
        <h2 className="font-display text-2xl">How to read each number</h2>
        <dl className="border-hair mt-6 divide-y divide-[var(--hair)] rounded-2xl border">
          {READING.map(([term, meaning]) => (
            <div key={term} className="grid gap-1 p-5 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <dt className="font-medium">{term}</dt>
              <dd className="text-ink-2 text-sm">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-hair mt-12 border-t pt-10">
        <h2 className="font-display text-2xl">Then do one thing well</h2>
        <p className="text-ink-2 mt-3">
          Read the contributing guide. Pick one available issue and say on it that you are
          working on it. Send one small, tested pull request. A fast project is not an
          invitation to send ten.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/match" className="btn">
            Find my project
          </Link>
          <Link href="/gsoc" className="btn btn-ghost">
            GSoC organisations
          </Link>
          <Link href="/issues" className="btn btn-ghost">
            Available issues
          </Link>
        </div>
      </section>
    </article>
  );
}
