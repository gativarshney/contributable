import { periodLabel } from "@/lib/analysis/time";
import type { Report } from "@/lib/report/run";
import { Block, Notes } from "./Block";
import { Columns } from "./charts";
import { ago, fmt, shortDay } from "./format";

/** Two numbers side by side, as bars on a shared scale. */
function Pair({
  title,
  a,
  b,
}: {
  title: string;
  a: { label: string; value: number };
  b: { label: string; value: number };
}) {
  const peak = Math.max(1, a.value, b.value);
  return (
    <div>
      <h3 className="mb-4 font-medium tracking-tight">{title}</h3>
      {[
        { ...a, color: "bg-accent/45" },
        { ...b, color: "bg-accent" },
      ].map((row) => (
        <div key={row.label} className="mb-3 flex items-center gap-4 text-sm">
          <span className="text-ink-2 w-16 shrink-0">{row.label}</span>
          <span className="flex-1">
            <span
              className={`block h-3 rounded-r-[4px] ${row.color}`}
              style={{ width: `${Math.max(1, (row.value / peak) * 100)}%` }}
            />
          </span>
          <span className="w-10 shrink-0 text-right font-medium">{fmt(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Pulse({ report }: { report: Report }) {
  const { activity, maintenance, releases, issues, pulls } = report.analysis;
  const recency = (id: string) => maintenance.recency.find((r) => r.id === id);
  const lastCommit = recency("commit")?.days ?? null;
  const covered = activity.windows[90].covered;
  const weeks = maintenance.activeWeeks;
  // Issue and pull request flow over a month, or less on repositories too busy to read.
  const issueFlow = issues.available ? issues.observed : null;
  const pullFlow = pulls.available ? pulls.observed : null;

  // Merges and closed issues are only looked for in the last 90 days.
  const seen = (days: number | null) => (days === null ? "none in 90 days" : ago(days));

  const tiles: [string, string, string?][] = [
    ["Last commit", ago(lastCommit)],
    [
      "Last release",
      releases.latest ? ago(releases.daysSinceLatest) : "none published",
      releases.latest?.tag,
    ],
    ["Last merged pull request", seen(recency("merge")?.days ?? null)],
    [
      "Last closed issue",
      issues.available ? seen(recency("issue")?.days ?? null) : "issues are off",
    ],
  ];

  return (
    <Block
      id="pulse"
      question="Is the project alive?"
      title={
        maintenance.archived ? (
          <>
            This repository is <em>archived.</em>
          </>
        ) : lastCommit === null ? (
          <>No commits were found.</>
        ) : lastCommit > 90 ? (
          <>
            It has been quiet: the last commit was <em>{ago(lastCommit)}.</em>
          </>
        ) : weeks !== null ? (
          <>
            Commits landed in <em>{weeks} of the last 13 weeks.</em>
          </>
        ) : (
          <>
            Very active: <em>{fmt(activity.windows[7].commits)} commits</em> in the last
            week alone.
          </>
        )
      }
    >
      <dl className="bg-hair border-hair grid grid-cols-2 gap-px overflow-hidden rounded-2xl border lg:grid-cols-4">
        {tiles.map(([label, value, detail]) => (
          <div key={label} className="bg-bg p-5">
            <dt className="text-ink-2 text-sm">{label}</dt>
            <dd className="mt-2 text-2xl leading-tight font-medium tracking-tight">
              {value}
            </dd>
            {detail ? (
              <dd className="text-ink-3 mt-1 truncate text-xs">{detail}</dd>
            ) : null}
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {covered ? (
          <div>
            <h3 className="mb-4 font-medium tracking-tight">Commits per week</h3>
            <Columns
              label="Commits per week over the last 12 weeks"
              unit="commits"
              data={activity.weekly.map((week) => ({
                label: `Week of ${shortDay(week.start)}`,
                value: week.count,
              }))}
            />
          </div>
        ) : (
          <p className="card text-ink-2 self-start p-5 text-[15px]">
            This repository moves faster than we can read: the most recent{" "}
            {fmt(activity.sampleSize)} commits cover only the last few days, so a weekly
            chart is not shown.
          </p>
        )}

        <div className="space-y-10">
          {issueFlow ? (
            <Pair
              title={`Issues, last ${periodLabel(issueFlow.days)}`}
              a={{ label: "Opened", value: issueFlow.opened }}
              b={{ label: "Closed", value: issueFlow.resolved }}
            />
          ) : null}
          {pullFlow ? (
            <Pair
              title={`Pull requests, last ${periodLabel(pullFlow.days)}`}
              a={{ label: "Opened", value: pullFlow.opened }}
              b={{ label: "Merged", value: pullFlow.resolved }}
            />
          ) : null}
          {releases.medianIntervalDays !== null && releases.count >= 4 ? (
            <p className="text-[15px]">
              <span className="text-ink-2">A new release roughly every </span>
              <strong className="font-medium">
                {Math.max(1, Math.round(releases.medianIntervalDays))} days
              </strong>
              <span className="text-ink-2">.</span>
            </p>
          ) : null}
        </div>
      </div>

      <Notes>
        <li>
          Commits are counted on the default branch ({report.repository.defaultBranch}).
        </li>
        <li>
          Merges and closed issues are only looked for in the last 90 days, so
          &ldquo;never&rdquo; means none in that period.
        </li>
        <li>
          Release rhythm is the median gap between the most recent releases published on
          GitHub. Projects that only use git tags show none.
        </li>
        <li>Activity is not quality: a quiet project can simply be finished.</li>
      </Notes>
    </Block>
  );
}
