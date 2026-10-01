"use client";

import { useMemo, useState } from "react";
import { Skyline } from "@/components/three/Skyline";
import type { FlowAnalysis } from "@/lib/analysis/issues";
import type { Report } from "@/lib/report/run";
import { WINDOWS, type WindowDays } from "@/types";
import { Contributing } from "./Contributing";
import {
  ago,
  Bars,
  compact,
  day,
  fmt,
  grid,
  Metric,
  Section,
  Unavailable,
} from "./primitives";

function Flow({
  flow,
  window: w,
  kind,
}: {
  flow: FlowAnalysis;
  window: WindowDays;
  kind: "issue" | "pull request";
}) {
  const data = flow.windows[w];
  const isIssue = kind === "issue";
  const verb = isIssue ? "closed" : "merged";
  if (!flow.available) {
    return (
      <Unavailable>
        {flow.note === "issues_disabled"
          ? "Issues are disabled for this repository."
          : (flow.note ?? `GitHub did not return ${kind} data for this repository.`)}
      </Unavailable>
    );
  }
  const v = (n: number | null) => (data.covered ? n : null);
  return (
    <>
      {!flow.complete ? (
        <p className="border-series-2 mb-6 border-l-2 px-4 py-2 text-sm">
          This repository has more issue and pull request activity than the collection
          limit allows. Events since{" "}
          {flow.coveredSince ? day(flow.coveredSince) : "an unknown date"} were read.
          Windows that reach further back show a dash, and the weekly chart is partial.
        </p>
      ) : null}
      <div className={grid}>
        <Metric
          label={`Open ${kind}s`}
          value={flow.openNow === null ? null : fmt(flow.openNow)}
          context="Right now"
          evidence={[[`Open ${kind}s`, flow.openNow ?? "unknown"]]}
          formula={
            isIssue
              ? "open_issues_count − open pull requests"
              : "Total from the pulls endpoint pagination header"
          }
          meaning={`The current backlog of open ${kind}s.`}
          caveat="A backlog reflects popularity and triage policy as much as responsiveness. It is not good or bad on its own."
        />
        <Metric
          label="Opened"
          value={v(data.opened)}
          context={`Last ${w} days · ${data.authors} author${data.authors === 1 ? "" : "s"}`}
          evidence={[
            [`${isIssue ? "Issues" : "Pull requests"} created in window`, data.opened],
            ["Distinct authors", data.authors],
          ]}
          meaning={`How much new ${isIssue ? "feedback and bug reporting" : "proposed change"} the repository receives.`}
          caveat="Counts every author equally, including maintainers and automation."
        />
        <Metric
          label={isIssue ? "Closed" : "Merged"}
          value={v(data.resolved)}
          context={
            isIssue
              ? `Last ${w} days · net ${data.opened - data.resolved >= 0 ? "+" : ""}${data.opened - data.resolved}`
              : `Last ${w} days · ${data.closedUnmerged} closed unmerged`
          }
          evidence={[
            [
              `${isIssue ? "Issues closed" : "Pull requests merged"} in window`,
              data.resolved,
            ],
            ...(isIssue
              ? ([["Net change (opened − closed)", data.opened - data.resolved]] as [
                  string,
                  number,
                ][])
              : ([["Closed without merge", data.closedUnmerged]] as [string, number][])),
          ]}
          meaning={`Shows whether ${kind}s are being ${verb}, regardless of when they were opened.`}
          caveat={
            isIssue
              ? "Closing is not resolving: issues are also closed as duplicates, stale or out of scope."
              : "Some projects land changes outside GitHub's merge button; those appear as closed unmerged."
          }
        />
        <Metric
          label={`Median time to ${isIssue ? "close" : "merge"}`}
          value={v(data.medianDaysToResolve)}
          unit="days"
          context={`${isIssue ? "Issues closed" : "Pull requests merged"} in the last ${w} days`}
          formula={`median(${verb}_at − created_at) over ${data.resolved} ${kind}${data.resolved === 1 ? "" : "s"}`}
          evidence={[
            [
              `${isIssue ? "Issues closed" : "Pull requests merged"} in window`,
              data.resolved,
            ],
          ]}
          meaning={`A typical wait between opening and ${isIssue ? "closing" : "merging"}, for those that were ${verb}.`}
          caveat={`Only covers ${kind}s that were ${verb}. Those still open, however old, are not in this figure.`}
        />
      </div>
      <Bars
        title={`${isIssue ? "Issues" : "Pull requests"} per week, last 13 weeks`}
        legend={["Opened", isIssue ? "Closed" : "Merged"]}
        data={flow.weekly.map((wk) => ({
          label: `week ending ${day(wk.end)}`,
          a: wk.opened,
          b: wk.resolved,
        }))}
      />
      {flow.recent.length > 0 ? (
        <details className="border-hair mt-px border p-6">
          <summary className="eyebrow hover:text-ink cursor-pointer">
            Most recently opened ({flow.recent.length})
          </summary>
          <ul className="mt-4 space-y-2 text-sm">
            {flow.recent.map((item) => (
              <li key={item.number} className="flex gap-3">
                <span className="text-ink-3 font-mono text-xs leading-6">
                  #{item.number}
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link min-w-0 truncate"
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

/**
 * Column spans that leave no empty cell in the findings grid: rows of three on wide
 * screens, with a short last row stretched (4 becomes 2 + 2, 5 becomes 3 + 2).
 */
function findingSpan(index: number, count: number): string {
  const md = count % 2 === 1 && index === count - 1 ? "md:col-span-2" : "md:col-span-1";
  const remainder = count % 3;
  let lg = "lg:col-span-2";
  if (count === 4 || (remainder === 2 && index >= count - 2)) lg = "lg:col-span-3";
  else if (remainder === 1 && index === count - 1) lg = "lg:col-span-6";
  return `${md} ${lg}`;
}

const NAV = [
  ["overview", "Overview"],
  ["contributing", "Contributing"],
  ["activity", "Activity"],
  ["maintenance", "Maintenance"],
  ["contributors", "Contributors"],
  ["releases", "Releases"],
  ["issues", "Issues"],
  ["pull-requests", "Pull requests"],
  ["methodology", "Methodology"],
];

export function ReportView({ report }: { report: Report }) {
  const [w, setW] = useState<WindowDays>(30);
  const { repository: repo, analysis, findings } = report;
  const { activity, contributors, releases, issues, pulls, maintenance } = analysis;
  const skyline = useMemo(
    () => activity.daily.slice(-84).map((d) => d.count),
    [activity.daily],
  );
  const act = activity.windows[w];
  const con = contributors.windows[w];
  const stats: [string, string][] = [
    ["Stars", compact(repo.stars)],
    ["Forks", compact(repo.forks)],
    ["Open issues", issues.openNow === null ? "—" : compact(issues.openNow)],
    ["Open PRs", pulls.openNow === null ? "—" : compact(pulls.openNow)],
    [
      "Age",
      maintenance.ageYears >= 1
        ? `${maintenance.ageYears} yr`
        : `${maintenance.ageDays} d`,
    ],
    ["Last push", ago(maintenance.recency[0].days)],
  ];

  return (
    <article className="shell pb-10">
      {report.sample ? (
        <p className="border-accent bg-accent-soft mt-8 border-l-2 px-4 py-3 text-sm">
          <strong className="font-medium">Example analysis.</strong> This repository does
          not exist. The data is illustrative and was generated to show what a report
          looks like.
        </p>
      ) : null}

      <header id="overview" className="pt-12 pb-12 md:pt-16">
        <div className="grid items-end gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <p className="eyebrow">
              Engineering report · data read {day(report.fetchedAt)},{" "}
              {report.fetchedAt.slice(11, 16)} UTC
            </p>
            <h1 className="display mt-5 text-[clamp(2.2rem,5.6vw,4.25rem)] break-words">
              <span className="inline-block max-w-full">{repo.owner}/</span>
              <wbr />
              <em>{repo.name}</em>
            </h1>
            {repo.description ? (
              <p className="text-ink-2 mt-5 max-w-2xl text-lg">{repo.description}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              {repo.archived ? (
                <span className="chip !border-danger !text-danger">Archived</span>
              ) : null}
              {repo.fork ? <span className="chip">Fork</span> : null}
              {repo.language ? <span className="chip">{repo.language}</span> : null}
              {repo.license ? <span className="chip">{repo.license}</span> : null}
              {repo.topics.slice(0, 6).map((topic) => (
                <span key={topic} className="chip !normal-case">
                  {topic}
                </span>
              ))}
              {!report.sample ? (
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="chip hover:text-ink"
                >
                  View on GitHub ↗
                </a>
              ) : null}
            </div>
          </div>
          {skyline.some((count) => count > 0) ? (
            <figure>
              <Skyline
                values={skyline}
                label={`Commits per day over the last 12 weeks, drawn as a 3D bar field. Peak ${Math.max(...skyline)} commits in a day.`}
                className="h-[220px] w-full"
              />
              <figcaption className="eyebrow mt-1 text-center">
                Commits per day · last 12 weeks{activity.complete ? "" : " · partial"}
              </figcaption>
            </figure>
          ) : null}
        </div>
        <dl className="border-hair mt-10 grid grid-cols-2 border-t sm:grid-cols-3 lg:grid-cols-6">
          {stats.map(([label, value]) => (
            <div key={label} className="border-hair border-b py-5 pr-4">
              <dt className="eyebrow">{label}</dt>
              <dd className="font-display mt-2 text-3xl leading-none">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section aria-labelledby="standout" className="border-hair border-t py-12">
        <p className="eyebrow">Executive overview</p>
        <h2 id="standout" className="display mt-4 text-[clamp(2rem,4.5vw,3.25rem)]">
          What <em>stands out</em>
        </h2>
        {findings.length === 0 ? (
          <p className="text-ink-2 mt-6 max-w-2xl">
            No finding rule was triggered. The individual measurements below still apply.
          </p>
        ) : (
          <ul className="bg-hair border-hair mt-10 grid gap-px border md:grid-cols-2 lg:grid-cols-6">
            {findings.map((f, i) => (
              <li
                key={f.id}
                className={`bg-bg flex flex-col p-6 ${findingSpan(i, findings.length)}`}
              >
                <p className="eyebrow !text-accent">{f.category}</p>
                <h3 className="font-display mt-3 text-2xl leading-tight">{f.title}</h3>
                <p className="mt-3 text-[15px]">{f.statement}</p>
                <p className="text-ink-3 mt-auto pt-5 text-xs">
                  Rule: {f.rule}{" "}
                  <a href={`#${f.anchor}`} className="link text-ink-2 whitespace-nowrap">
                    See evidence
                  </a>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="bg-bg/90 border-hair sticky top-16 z-30 -mx-[clamp(20px,4vw,48px)] flex items-center gap-4 border-y px-[clamp(20px,4vw,48px)] py-3 backdrop-blur-md">
        <nav aria-label="Report sections" className="min-w-0 flex-1 overflow-x-auto">
          <ul className="flex gap-5 text-sm whitespace-nowrap">
            {NAV.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="text-ink-2 hover:text-ink transition-colors"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div
          role="group"
          aria-label="Analysis window"
          className="border-hair-strong flex rounded-full border p-0.5"
        >
          {WINDOWS.map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={w === days}
              onClick={() => setW(days)}
              className={`cursor-pointer rounded-full px-3 py-1 font-mono text-xs transition-colors ${
                w === days ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      <Contributing report={report} window={w} />

      <Section
        id="activity"
        index="01 — Activity"
        title="Commit activity"
        lede={`Commits that reached ${repo.defaultBranch}, the default branch, in the trailing ${w} days.`}
      >
        {!activity.available ? (
          <Unavailable>
            GitHub did not return commit history for this repository.
          </Unavailable>
        ) : activity.empty ? (
          <Unavailable>This repository has no commits yet.</Unavailable>
        ) : (
          <>
            {!activity.complete ? (
              <p className="border-series-2 mb-6 border-l-2 px-4 py-2 text-sm">
                This repository is more active than the collection limit allows. The{" "}
                {fmt(activity.sampleSize)} most recent commits were read, covering
                activity since{" "}
                {activity.coveredSince ? day(activity.coveredSince) : "an unknown date"}.
                Windows that reach further back are not reported.
              </p>
            ) : null}
            <div className={grid}>
              <Metric
                label="Commits"
                value={act.covered ? fmt(act.commits) : null}
                context={`Last ${w} days`}
                evidence={[
                  ["Commits in window", act.commits],
                  ["Branch", repo.defaultBranch],
                  [
                    "Last commit",
                    activity.lastCommitAt ? day(activity.lastCommitAt) : "none",
                  ],
                ]}
                meaning="A direct count of how much change reached the default branch."
                caveat="Commit counts depend on workflow. Squash merging produces fewer, larger commits than merge commits do."
              />
              <Metric
                label="Active days"
                value={act.covered ? act.activeDays : null}
                unit={`/ ${w}`}
                context="Days with at least one commit"
                formula="count of distinct UTC dates with ≥ 1 commit"
                evidence={[
                  ["Active days", act.activeDays],
                  ["Days in window", w],
                ]}
                meaning="Separates steady work from a single burst that produces the same total."
                caveat="Days are counted in UTC and may not match the maintainers' working days."
              />
              <Metric
                label="Weekly rate"
                value={act.covered ? act.commitsPerWeek : null}
                unit="/ wk"
                context={`Average over ${w} days`}
                formula={`${act.commits} commits ÷ (${w} ÷ 7) weeks`}
                evidence={[["Commits in window", act.commits]]}
                meaning="Normalises the count so windows of different length can be compared."
                caveat="An average hides variation; read it together with the daily chart."
              />
              <Metric
                label="Against previous period"
                value={
                  act.covered && act.changePct !== null
                    ? `${act.changePct > 0 ? "+" : ""}${act.changePct}`
                    : null
                }
                unit="%"
                context={`Versus the ${w} days before`}
                formula="(current − previous) ÷ previous × 100"
                evidence={[
                  ["Current period", act.commits],
                  ["Previous period", act.previousCommits ?? "not covered"],
                ]}
                meaning="Shows whether commit volume is rising or falling."
                caveat="Short windows swing widely. Not calculated for 90 days, or when the previous period had no commits."
              />
            </div>
            <Bars
              title={`Commits per day, last ${w} days`}
              legend={["Commits"]}
              data={activity.daily.slice(-w).map((d) => ({ label: d.date, a: d.count }))}
            />
          </>
        )}
      </Section>

      <Section
        id="maintenance"
        index="02 — Maintenance"
        title="Recency"
        lede="How long ago each kind of activity last happened. These are observations, not a verdict on whether the project is maintained."
      >
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Most recent activity by type</caption>
          <thead>
            <tr className="eyebrow border-hair border-b">
              <th scope="col" className="py-3 font-medium">
                Signal
              </th>
              <th scope="col" className="hidden py-3 font-medium sm:table-cell">
                Date
              </th>
              <th scope="col" className="py-3 text-right font-medium">
                Elapsed
              </th>
            </tr>
          </thead>
          <tbody>
            {maintenance.recency.map((r) => (
              <tr key={r.id} className="border-hair border-b">
                <th scope="row" className="py-4 pr-4 font-normal">
                  {r.label}
                </th>
                <td className="text-ink-2 hidden py-4 font-mono text-xs sm:table-cell">
                  {r.date ? day(r.date) : "none observed"}
                </td>
                <td className="font-display py-4 text-right text-2xl whitespace-nowrap">
                  {r.date ? ago(r.days) : <span className="text-ink-3">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-ink-2 mt-6 max-w-3xl text-sm">
          Created {day(repo.createdAt)} ({fmt(maintenance.ageDays)} days ago).
          {maintenance.activeWeeks !== null
            ? ` Commits landed in ${maintenance.activeWeeks} of the last 13 weeks.`
            : ""}
          {maintenance.archived ? " The repository is archived and read-only." : ""}{" "}
          Merges and closed issues are only observed within the last 90 days; a dash means
          none was seen in that period.
        </p>
      </Section>

      <Section
        id="contributors"
        index="03 — Contributors"
        title="Contributor concentration"
        lede={`How commit authorship in the trailing ${w} days is distributed across people. Bot accounts are excluded.`}
      >
        {!contributors.available || con.humanCommits === 0 ? (
          <Unavailable>
            No human-authored commits were observed in this window, so concentration is
            not calculated.
          </Unavailable>
        ) : (
          <>
            <div className={grid}>
              <Metric
                label="Top contributor share"
                value={con.covered ? con.topShare : null}
                unit="%"
                context={`Of ${fmt(con.humanCommits)} commits, last ${w} days`}
                formula={`${con.distribution[0]?.commits} ÷ ${con.humanCommits} × 100`}
                evidence={[
                  ["Most active author", con.distribution[0]?.name ?? "—"],
                  ["Their commits", con.distribution[0]?.commits ?? 0],
                  ["Human-authored commits", con.humanCommits],
                  ["Bot commits excluded", con.botCommits],
                ]}
                meaning="A high share means a large portion of observed commit activity comes from one person."
                caveat="This is a concentration signal, not proof of project risk. Squash merges credit the person who merged, and review work is invisible here."
              />
              <Metric
                label="Top three share"
                value={con.covered ? con.top3Share : null}
                unit="%"
                context="Three most active authors"
                formula="sum of top 3 authors' commits ÷ human-authored commits × 100"
                evidence={con.distribution.slice(0, 3).map((d) => [d.name, d.commits])}
                meaning="Shows whether work is spread beyond a small core group."
                caveat="Many healthy projects have a small core team. Concentration describes structure, not quality."
              />
              <Metric
                label="Active contributors"
                value={con.covered ? con.contributors : null}
                context={`Distinct commit authors, last ${w} days`}
                evidence={[
                  ["Distinct human authors", con.contributors],
                  ["Total commits in window", con.totalCommits],
                ]}
                meaning="The number of people whose commits reached the default branch."
                caveat="One person committing under two identities is counted twice; unlinked emails are grouped by name."
              />
              <Metric
                label="Authors of half the commits"
                value={con.covered ? con.halfCount : null}
                context="Smallest group reaching 50%"
                formula="fewest authors whose commits sum to ≥ 50% of human-authored commits"
                evidence={[["Human-authored commits", con.humanCommits]]}
                meaning="A compact way to read the distribution: how many people account for half of the work."
                caveat="Measured in commits, which vary greatly in size and significance."
              />
            </div>
            <div className="border-hair mt-px border p-6">
              <p className="eyebrow">Commit distribution, last {w} days</p>
              <ol className="mt-5 space-y-3">
                {con.distribution.map((d) => (
                  <li
                    key={d.name}
                    className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-4 text-sm"
                  >
                    <span className="truncate">{d.name}</span>
                    <span className="bg-bg-2 h-2 overflow-hidden rounded-full">
                      <span
                        className="bg-accent block h-full rounded-full"
                        style={{ width: `${d.share}%` }}
                      />
                    </span>
                    <span className="text-ink-2 w-28 text-right font-mono text-xs">
                      {d.commits} · {d.share}%
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="text-ink-2 mt-6 max-w-3xl text-sm">
              {contributors.allTime.available
                ? `All time: GitHub lists ${contributors.allTime.complete ? "" : "more than "}${contributors.allTime.listed} contributors; the most active accounts for ${contributors.allTime.topShare}% of commits among those listed.`
                : (contributors.allTime.note ??
                  "All-time contributor data is not available.")}
            </p>
          </>
        )}
      </Section>

      <Section
        id="releases"
        index="04 — Releases"
        title="Release history"
        lede="Releases published through GitHub Releases. More releases are not better or worse; this describes the observed rhythm."
      >
        {!releases.available ? (
          <Unavailable>
            GitHub did not return release history for this repository.
          </Unavailable>
        ) : releases.latest === null ? (
          <Unavailable>
            No GitHub Releases have been published. The project may version through git
            tags or a package registry instead, which this report does not read.
          </Unavailable>
        ) : (
          <>
            <div className={grid}>
              <Metric
                label="Latest release"
                value={ago(releases.daysSinceLatest)}
                context={`${releases.latest.tag} · ${day(releases.latest.publishedAt)}`}
                evidence={[
                  ["Tag", releases.latest.tag],
                  ["Published", day(releases.latest.publishedAt)],
                  ["Pre-release", releases.latest.prerelease ? "yes" : "no"],
                ]}
                meaning="How recently users received a published version."
                caveat="Stable, finished software can go a long time without needing a release."
              />
              <Metric
                label="Median interval"
                value={releases.medianIntervalDays}
                unit="days"
                context={`Between the ${releases.count} most recent releases`}
                formula="median of gaps between consecutive publish dates"
                evidence={[
                  ["Releases considered", releases.count],
                  ["Shortest gap (days)", releases.shortestIntervalDays ?? "—"],
                  ["Longest gap (days)", releases.longestIntervalDays ?? "—"],
                ]}
                meaning="The typical wait between releases, resistant to one-off pauses or bursts."
                caveat="Needs at least two releases. Pre-releases are included and can shorten the figure."
              />
              <Metric
                label="Last 12 months"
                value={releases.last365}
                context={`${releases.last90} in the last 90 days`}
                evidence={[
                  ["Published in last 365 days", releases.last365],
                  ["Published in last 90 days", releases.last90],
                ]}
                meaning="Recent release volume, independent of the long-run cadence."
                caveat="Counts releases, not their size. A patch and a major version count the same."
              />
              <Metric
                label="Releases read"
                value={`${releases.count}${releases.complete ? "" : "+"}`}
                context={`${releases.prereleases} marked pre-release`}
                evidence={[
                  ["Releases returned by GitHub", releases.count],
                  ["More exist beyond these", releases.complete ? "no" : "yes"],
                ]}
                meaning="The size of the sample every release figure is based on."
                caveat="Only the 100 most recent releases are read."
              />
            </div>
            <div className="border-hair mt-px border p-6">
              <p className="eyebrow">Release timeline, last 12 months</p>
              {releases.timeline.length === 0 ? (
                <p className="text-ink-2 mt-4 text-sm">
                  No releases in the last 12 months.
                </p>
              ) : (
                <>
                  <div
                    className="border-hair-strong relative mt-8 h-6 border-b"
                    aria-hidden="true"
                  >
                    {releases.timeline.map((r) => {
                      const elapsed =
                        (new Date(report.fetchedAt).getTime() -
                          new Date(r.publishedAt).getTime()) /
                        (365 * 86_400_000);
                      return (
                        <span
                          key={r.tag + r.publishedAt}
                          title={`${r.tag} · ${day(r.publishedAt)}`}
                          className={`absolute bottom-0 w-px ${r.prerelease ? "bg-ink-3 h-3" : "bg-accent h-6"}`}
                          style={{ left: `${(1 - elapsed) * 100}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="text-ink-3 mt-2 flex justify-between font-mono text-[11px]">
                    <span>12 months ago</span>
                    <span>today</span>
                  </div>
                  <ul className="mt-6 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    {releases.timeline.slice(0, 8).map((r) => (
                      <li
                        key={r.tag + r.publishedAt}
                        className="flex justify-between gap-4"
                      >
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="link truncate font-mono text-xs leading-6"
                        >
                          {r.tag}
                        </a>
                        <span className="text-ink-2 font-mono text-xs leading-6 whitespace-nowrap">
                          {day(r.publishedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </Section>

      <Section
        id="issues"
        index="05 — Issues"
        title="Issue activity"
        lede={`Issues opened and closed in the trailing ${w} days. Pull requests are counted separately.`}
      >
        <Flow flow={issues} window={w} kind="issue" />
      </Section>

      <Section
        id="pull-requests"
        index="06 — Pull requests"
        title="Pull request activity"
        lede={`Pull requests opened, merged and closed in the trailing ${w} days.`}
      >
        <Flow flow={pulls} window={w} kind="pull request" />
      </Section>

      <Section
        id="methodology"
        index="07 — Methodology"
        title="How this report was made"
        lede="Everything above was calculated from GitHub's public REST API by deterministic code. No language model was involved."
      >
        <div className="grid gap-x-16 gap-y-8 text-[15px] md:grid-cols-2">
          {[
            [
              "Data sources",
              "Repository metadata, the commit list of the default branch, the contributor list, published releases, issues and pull requests updated in the last 90 days, their conversation comments, starter-labelled issues and the community profile.",
            ],
            [
              "Windows",
              `Trailing 7, 30 and 90 days, measured back from ${day(report.fetchedAt)} ${report.fetchedAt.slice(11, 16)} UTC, when the data was read.`,
            ],
            [
              "Findings",
              "Each finding under “What stands out” is produced by a fixed rule, printed beneath it. If no rule fires, nothing is said.",
            ],
            [
              "No score",
              "Signals are not combined into a health score. There is no defensible way to weigh them for every project, so they are reported separately.",
            ],
            [
              "Coverage",
              "Lists are read up to a fixed number of pages. When a repository exceeds it, affected windows show a dash rather than a partial number.",
            ],
            [
              "What this cannot see",
              "Private activity, other branches, code quality, test coverage, security posture, or the intent behind any change.",
            ],
          ].map(([term, detail]) => (
            <div key={term} className="border-hair border-t pt-4">
              <h3 className="font-display text-2xl">{term}</h3>
              <p className="text-ink-2 mt-2">{detail}</p>
            </div>
          ))}
        </div>
      </Section>
    </article>
  );
}
