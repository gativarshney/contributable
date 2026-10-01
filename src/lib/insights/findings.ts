import type { Analysis } from "@/lib/analysis";
import type { Repository } from "@/types";

export interface Finding {
  id: string;
  category: string;
  title: string;
  /** A sentence built only from calculated values. */
  statement: string;
  /** The rule that produced this finding, shown to the reader. */
  rule: string;
  anchor: string;
}

const plural = (n: number, word: string) =>
  `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

/**
 * Deterministic findings. Each rule states its threshold; nothing here is inferred
 * beyond what the numbers say. Order is fixed so the same analysis reads the same way.
 */
export function buildFindings(repository: Repository, analysis: Analysis): Finding[] {
  const findings: Finding[] = [];
  const { activity, contributors, releases, issues, pulls, maintenance } = analysis;

  if (repository.archived) {
    findings.push({
      id: "archived",
      category: "Maintenance",
      title: "Archived repository",
      statement: "The owner has archived this repository. It is read-only on GitHub.",
      rule: "GitHub reports archived = true.",
      anchor: "maintenance",
    });
  }

  const a30 = activity.windows[30];
  if (activity.available && a30.covered) {
    if (a30.commits >= 20 && a30.activeDays >= 8) {
      findings.push({
        id: "active",
        category: "Activity",
        title: "Active development",
        statement: `${plural(a30.commits, "commit")} were recorded on the default branch in the last 30 days, across ${plural(a30.activeDays, "active day")}.`,
        rule: "At least 20 commits on at least 8 distinct days in the last 30 days.",
        anchor: "activity",
      });
    } else if (a30.commits === 0) {
      const days = maintenance.recency.find((r) => r.id === "commit")?.days;
      findings.push({
        id: "quiet",
        category: "Activity",
        title: "No commits in the last 30 days",
        statement:
          days != null
            ? `The most recent commit on the default branch was ${plural(days, "day")} ago.`
            : "No commits were found on the default branch.",
        rule: "Zero commits on the default branch in the last 30 days.",
        anchor: "activity",
      });
    } else if (a30.commits >= 20) {
      findings.push({
        id: "bursts",
        category: "Activity",
        title: "Commits concentrated in a few days",
        statement: `${plural(a30.commits, "commit")} were recorded in the last 30 days, on ${plural(a30.activeDays, "active day")}.`,
        rule: "At least 20 commits on fewer than 8 distinct days in the last 30 days.",
        anchor: "activity",
      });
    } else {
      findings.push({
        id: "some-activity",
        category: "Activity",
        title: "Occasional commit activity",
        statement: `${plural(a30.commits, "commit")} were recorded in the last 30 days, across ${plural(a30.activeDays, "active day")}.`,
        rule: "Between 1 and 19 commits in the last 30 days.",
        anchor: "activity",
      });
    }
    if (
      a30.changePct !== null &&
      a30.previousCommits! >= 10 &&
      Math.abs(a30.changePct) >= 50
    ) {
      findings.push({
        id: "trend",
        category: "Activity",
        title: a30.changePct > 0 ? "Commit volume increased" : "Commit volume decreased",
        statement: `${a30.commits} commits in the last 30 days against ${a30.previousCommits} in the 30 days before (${a30.changePct > 0 ? "+" : ""}${a30.changePct}%).`,
        rule: "A change of 50% or more against a previous period with at least 10 commits.",
        anchor: "activity",
      });
    }
  } else if (activity.available && !activity.complete) {
    findings.push({
      id: "high-volume",
      category: "Activity",
      title: "Commit volume exceeds the collection limit",
      statement: `The ${activity.sampleSize.toLocaleString("en-US")} most recent commits do not reach back 30 days, so window totals are not reported.`,
      rule: "The commit list was truncated before the start of the 30-day window.",
      anchor: "activity",
    });
  }

  const c90 = contributors.windows[90];
  const cWindow = c90.covered
    ? c90
    : contributors.windows[30].covered
      ? contributors.windows[30]
      : null;
  if (cWindow && cWindow.humanCommits >= 10 && cWindow.topShare !== null) {
    const span = cWindow === c90 ? 90 : 30;
    if (cWindow.topShare >= 50) {
      findings.push({
        id: "concentrated",
        category: "Contributors",
        title: "Contribution concentration",
        statement: `One contributor authored ${cWindow.topShare}% of ${cWindow.humanCommits} human-authored commits in the last ${span} days.`,
        rule: "Top contributor share of 50% or more, with at least 10 commits in the window.",
        anchor: "contributors",
      });
    } else if (cWindow.contributors >= 10 && cWindow.top3Share! < 50) {
      findings.push({
        id: "distributed",
        category: "Contributors",
        title: "Broadly distributed contributions",
        statement: `${cWindow.contributors} contributors authored commits in the last ${span} days; the three most active account for ${cWindow.top3Share}%.`,
        rule: "At least 10 contributors and a top-three share below 50%.",
        anchor: "contributors",
      });
    }
  }

  if (releases.available) {
    if (releases.latest === null) {
      findings.push({
        id: "no-releases",
        category: "Releases",
        title: "No published releases",
        statement:
          "This repository has no GitHub Releases. It may still version through git tags or a package registry.",
        rule: "The releases endpoint returned no published releases.",
        anchor: "releases",
      });
    } else if (releases.daysSinceLatest! <= 30) {
      findings.push({
        id: "recent-release",
        category: "Releases",
        title: "Recent release",
        statement: `${releases.latest.tag} was published ${plural(releases.daysSinceLatest!, "day")} ago.`,
        rule: "Latest release published within the last 30 days.",
        anchor: "releases",
      });
    } else if (releases.daysSinceLatest! > 365) {
      findings.push({
        id: "stale-release",
        category: "Releases",
        title: "No release in over a year",
        statement: `The latest release, ${releases.latest.tag}, was published ${plural(releases.daysSinceLatest!, "day")} ago.`,
        rule: "Latest release published more than 365 days ago.",
        anchor: "releases",
      });
    }
    if (releases.medianIntervalDays !== null && releases.count >= 4) {
      findings.push({
        id: "cadence",
        category: "Releases",
        title: "Observed release cadence",
        statement: `The median gap between the ${releases.count} most recent releases is ${releases.medianIntervalDays} days.`,
        rule: "Reported when at least 4 releases exist.",
        anchor: "releases",
      });
    }
  }

  const i30 = issues.windows[30];
  if (issues.available && i30.covered && i30.opened + i30.resolved >= 5) {
    const kept = i30.resolved >= i30.opened;
    findings.push({
      id: "issue-flow",
      category: "Issues",
      title: kept
        ? "Issue closures kept pace with new issues"
        : "More issues opened than closed",
      statement: `${plural(i30.opened, "issue")} opened and ${i30.resolved} closed in the last 30 days.`,
      rule: "Compares issues opened and closed in the last 30 days (at least 5 events).",
      anchor: "issues",
    });
  }

  const p30 = pulls.windows[30];
  if (pulls.available && p30.covered && p30.resolved > 0) {
    findings.push({
      id: "pr-flow",
      category: "Pull requests",
      title: "Pull requests are being merged",
      statement: `${plural(p30.resolved, "pull request")} merged in the last 30 days${
        p30.medianDaysToResolve !== null
          ? `, with a median of ${p30.medianDaysToResolve} days from opening to merge`
          : ""
      }.`,
      rule: "At least one pull request merged in the last 30 days.",
      anchor: "pull-requests",
    });
  }

  if (maintenance.ageDays < 90) {
    findings.push({
      id: "young",
      category: "Maintenance",
      title: "New repository",
      statement: `Created ${plural(maintenance.ageDays, "day")} ago. Windowed metrics cover most of its history.`,
      rule: "Repository created less than 90 days ago.",
      anchor: "maintenance",
    });
  }

  return findings.slice(0, 6);
}
