import { wholeDaysSince } from "@/lib/analysis/time";
import type { Report } from "@/lib/report/run";
import type { WindowDays } from "@/types";
import { ago, fmt, grid, Metric, Unavailable } from "./primitives";

/** Hours read better than fractional days for quick replies. */
function duration(hours: number): { value: string; unit: string } {
  if (hours < 1)
    return { value: String(Math.max(1, Math.round(hours * 60))), unit: "min" };
  if (hours < 48) return { value: String(Math.round(hours)), unit: "h" };
  return { value: String(Math.round((hours / 24) * 10) / 10), unit: "days" };
}

export function Contributing({
  report,
  window: w,
}: {
  report: Report;
  window: WindowDays;
}) {
  const { contributing } = report.analysis;
  const { starter, files } = contributing;
  const data = contributing.windows[w];
  const now = new Date(report.fetchedAt);
  const closed = data.communityMerged + data.communityClosedUnmerged;
  const response =
    data.medianHoursToResponse === null ? null : duration(data.medianHoursToResponse);

  return (
    <section id="contributing" className="border-hair border-t py-14 md:py-20">
      <p className="eyebrow !text-accent">For contributors</p>
      <h2 className="display mt-4 text-[clamp(2rem,4.5vw,3.25rem)]">
        Before your <em>first pull request</em>
      </h2>
      <p className="text-ink-2 mt-3 max-w-2xl">
        Where to start, whether work from outside the team gets merged, and how long
        people wait to hear back. Measured over the trailing {w} days.
      </p>

      <div className={`${grid} mt-10`}>
        <Metric
          label="Starter issues"
          value={starter.available ? fmt(starter.unassigned) : null}
          unit="open"
          context={`Unassigned, of ${starter.total}${starter.complete ? "" : "+"} labelled for newcomers`}
          missing="GitHub did not return labelled issues."
          formula='open issues labelled "good first issue" or "help wanted" with no assignee'
          evidence={[
            [
              "Open issues with a starter label",
              `${starter.total}${starter.complete ? "" : "+"}`,
            ],
            ["Of those, unassigned", starter.unassigned],
            ["Median age (days)", starter.medianAgeDays ?? "—"],
          ]}
          meaning="Finding a first task is the barrier newcomers report most often. These are issues a maintainer marked as approachable that nobody has claimed."
          caveat="Only GitHub's two default labels are checked, so projects with their own labels show zero. An unassigned issue can still have someone's pull request open against it."
        />
        <Metric
          label="Community PRs merged"
          value={contributing.available && data.covered ? data.mergeShare : null}
          unit="%"
          context={`${data.communityMerged} of ${closed} closed, last ${w} days`}
          missing={
            data.covered
              ? `No community pull requests were closed in the last ${w} days.`
              : undefined
          }
          formula="merged ÷ (merged + closed without merge) × 100"
          evidence={[
            ["Community PRs merged", data.communityMerged],
            ["Community PRs closed without merge", data.communityClosedUnmerged],
            ["Community PRs opened", data.communityOpened],
            ["All human-authored PRs opened", data.humanOpened],
          ]}
          meaning="Shows how often work from people outside the team ends up in the codebase."
          caveat="Team membership comes from GitHub's author association. Organisation members who keep their membership private are counted as community. It does not say why a pull request was closed."
        />
        <Metric
          label="Time to merge"
          value={contributing.available && data.covered ? data.medianDaysToMerge : null}
          unit="days"
          context={`Median for ${data.communityMerged} community PR${data.communityMerged === 1 ? "" : "s"}`}
          missing={
            data.covered
              ? `No community pull requests were merged in the last ${w} days.`
              : undefined
          }
          formula="median(merged_at − created_at) over community PRs merged in the window"
          evidence={[["Community PRs merged in window", data.communityMerged]]}
          meaning="A typical wait from opening a pull request to seeing it merged, for outside contributors."
          caveat="Only merged pull requests are included. Those still open, however long, are not in this figure."
        />
        <Metric
          label="First human response"
          value={
            contributing.available && data.responseCovered && response
              ? response.value
              : null
          }
          unit={response?.unit}
          context={`${data.answered} of ${data.threads} community threads answered`}
          missing={
            data.responseCovered
              ? data.threads === 0
                ? `No issues or pull requests were opened by the community in the last ${w} days.`
                : `None of ${data.threads} community threads has a response yet.`
              : undefined
          }
          formula="median(first reply by another person, or merge − opened_at)"
          evidence={[
            ["Issues and PRs opened by the community", data.threads],
            ["Received a human response", data.answered],
            ["No response observed", data.threads - data.answered],
          ]}
          meaning="Slow or missing first responses are among the strongest predictors of contributors abandoning their work."
          caveat="Counts conversation comments and merges. Review approvals and inline review comments are not visible here, so a pull request answered only by a review appears unanswered. Bot replies are ignored."
        />
      </div>

      <div className="bg-hair border-hair mt-px grid gap-px border border-t-0 lg:grid-cols-2">
        <div className="bg-bg p-6">
          <h3 className="eyebrow">Before you start</h3>
          {files ? (
            <ul className="mt-4">
              {files.map((file) => (
                <li
                  key={file.key}
                  className="border-hair flex items-center justify-between gap-4 border-b py-3 text-sm last:border-b-0"
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`size-1.5 rounded-full ${file.url !== null ? "bg-accent" : "bg-bg-3"}`}
                    />
                    {file.label}
                  </span>
                  {file.url === null ? (
                    <span className="text-ink-3">Not detected</span>
                  ) : file.url && !report.sample ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="link text-ink-2"
                    >
                      Found ↗
                    </a>
                  ) : (
                    <span className="text-ink-2">Found</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-2 mt-4 text-sm">
              GitHub did not return a community profile for this repository.
            </p>
          )}
          <p className="text-ink-3 mt-4 text-xs">
            As detected by GitHub in the standard locations. A guide kept elsewhere, such
            as a docs site, will not appear.
          </p>
        </div>

        <div className="bg-bg p-6">
          <h3 className="eyebrow">Where to start</h3>
          {starter.issues.length > 0 ? (
            <ul className="mt-4">
              {starter.issues.map((issue) => (
                <li
                  key={issue.number}
                  className="border-hair border-b py-3 last:border-b-0"
                >
                  <a
                    href={report.sample ? undefined : issue.url}
                    target="_blank"
                    rel="noreferrer"
                    className="link block truncate text-sm"
                  >
                    {issue.title}
                  </a>
                  <p className="text-ink-3 mt-1 font-mono text-[11px]">
                    #{issue.number} · {issue.label} · opened{" "}
                    {ago(wholeDaysSince(issue.createdAt, now))} · {issue.comments} comment
                    {issue.comments === 1 ? "" : "s"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-2 mt-4 text-sm">
              {starter.available
                ? "No unassigned open issues carry the labels “good first issue” or “help wanted”. The project may use its own labels, so check its issue tracker and contributing guide."
                : "GitHub did not return labelled issues for this repository."}
            </p>
          )}
          {!report.sample ? (
            <a
              href={`${report.repository.url}/contribute`}
              target="_blank"
              rel="noreferrer"
              className="link text-ink-2 mt-4 inline-block text-sm"
            >
              GitHub&rsquo;s contribute page for this repository ↗
            </a>
          ) : null}
        </div>
      </div>

      {!contributing.available ? (
        <div className="mt-6">
          <Unavailable>
            GitHub did not return issues or pull requests, so merge and response figures
            are not available.
          </Unavailable>
        </div>
      ) : null}
    </section>
  );
}
