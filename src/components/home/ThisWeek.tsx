import Link from "next/link";
import type { AvailableIssue, IndexRow } from "@/core/published";
import { date, duration } from "@/lib/format";

const LIST = 5;
/** Enough outside pull requests for a change in reply time to mean something. */
const SOLID = 20;
const FRESH_DAYS = 14;
const DAY_MS = 86_400_000;

function Column({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <div>
      <h3 className="eyebrow !text-accent">{title}</h3>
      {children.length > 0 ? (
        <ul className="border-hair mt-4 divide-y divide-[var(--hair)] border-y">
          {children}
        </ul>
      ) : (
        <p className="text-ink-3 border-hair mt-4 border-y py-4 text-sm">{empty}</p>
      )}
    </div>
  );
}

/**
 * What changed lately: first issues that just became available, and projects whose
 * reply time moved. This is the part of the home page that differs between visits.
 */
export function ThisWeek({
  rows,
  issues,
  now,
}: {
  rows: readonly IndexRow[];
  issues: readonly AvailableIssue[];
  now: number;
}) {
  if (rows.length === 0) return null;
  const fresh = issues
    .filter(
      (i) =>
        i.label === "beginner" && now - Date.parse(i.createdAt) < FRESH_DAYS * DAY_MS,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, LIST);
  const moved = (flag: IndexRow["trend"]) =>
    rows
      // A project that merges almost nothing on GitHub reviews elsewhere; its reply
      // time here says nothing, so it is not listed as faster or slower.
      .filter(
        (r) =>
          r.trend === flag &&
          r.replyN >= SOLID &&
          r.replyHours !== null &&
          r.mergeRate !== null &&
          r.mergeRate >= 0.3,
      )
      .sort((a, b) => b.stars - a.stars)
      .slice(0, LIST);
  const faster = moved("got-faster");
  const slower = moved("slowed-down");

  const repoLine = (row: IndexRow, tone: string) => (
    <li key={row.id}>
      <Link
        href={`/repo/${row.id}`}
        className="group flex min-h-12 items-center justify-between gap-4 py-2 text-sm"
      >
        <span className="group-hover:text-accent min-w-0 truncate transition-colors">
          {row.id}
        </span>
        <span className={`num shrink-0 text-xs ${tone}`}>{duration(row.replyHours)}</span>
      </Link>
    </li>
  );

  return (
    <section className="border-hair border-t py-20 md:py-28">
      <div className="shell">
        <p className="eyebrow">Lately</p>
        <h2 className="display mt-5 max-w-3xl text-[clamp(2rem,4.6vw,3.25rem)]">
          What changed <em>since you last looked.</em>
        </h2>
        <div className="mt-12 grid gap-10 lg:grid-cols-3">
          <Column
            title="New first issues"
            empty="No new first issue in the last two weeks."
          >
            {fresh.map((issue) => (
              <li key={`${issue.id}#${issue.n}`}>
                <a
                  href={`https://github.com/${issue.id}/issues/${issue.n}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group block py-3 text-sm"
                >
                  <span className="group-hover:text-accent line-clamp-1 transition-colors">
                    {issue.title}
                  </span>
                  <span className="text-ink-3 num mt-0.5 block text-xs">
                    {issue.id} · opened {date(issue.createdAt)}
                  </span>
                </a>
              </li>
            ))}
          </Column>
          <Column title="Replying faster" empty="No project sped up this month.">
            {faster.map((row) => repoLine(row, "text-fast"))}
          </Column>
          <Column title="Replying slower" empty="No project slowed down this month.">
            {slower.map((row) => repoLine(row, "text-slow"))}
          </Column>
        </div>
        <p className="text-ink-3 mt-6 text-xs">
          Faster or slower: the median first reply of the last four weeks against the four
          before, on projects with at least {SOLID} outside pull requests. The figure
          shown is the current four-month median.
        </p>
      </div>
    </section>
  );
}
