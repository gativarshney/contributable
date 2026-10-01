import type { Dataset } from "@/types";
import { calculateActivity, type ActivityAnalysis } from "./activity";
import {
  calculateContributingSignals,
  calculateStack,
  type ContributingAnalysis,
  type LanguageShare,
} from "./contributing";
import { calculateContributors, type ContributorAnalysis } from "./contributors";
import {
  calculateIssueSignals,
  calculatePullRequestSignals,
  type FlowAnalysis,
} from "./issues";
import { calculateReleaseCadence, type ReleaseAnalysis } from "./releases";
import { daysBetween, round, wholeDaysSince } from "./time";

export interface RecencyEntry {
  id: string;
  label: string;
  date: string | null;
  days: number | null;
}

export interface MaintenanceAnalysis {
  ageDays: number;
  ageYears: number;
  archived: boolean;
  /** How long ago each kind of activity last happened, as observed in the fetched data. */
  recency: RecencyEntry[];
  /** Weeks with at least one commit in the trailing 13 weeks; null when not fully covered. */
  activeWeeks: number | null;
}

export interface Analysis {
  activity: ActivityAnalysis;
  contributors: ContributorAnalysis;
  releases: ReleaseAnalysis;
  issues: FlowAnalysis;
  pulls: FlowAnalysis;
  maintenance: MaintenanceAnalysis;
  contributing: ContributingAnalysis;
  stack: LanguageShare[];
}

export function calculateRepositoryAge(createdAt: string, now: Date) {
  const days = wholeDaysSince(createdAt, now);
  return { ageDays: days, ageYears: round(daysBetween(createdAt, now) / 365.25) };
}

export function calculateMaintenanceSignals(
  dataset: Dataset,
  parts: Pick<Analysis, "activity" | "releases" | "issues" | "pulls">,
  now: Date,
): MaintenanceAnalysis {
  const entry = (id: string, label: string, date: string | null): RecencyEntry => ({
    id,
    label,
    date,
    days: date ? wholeDaysSince(date, now) : null,
  });

  let activeWeeks: number | null = null;
  if (parts.activity.windows[90].covered) {
    activeWeeks = 0;
    // daily has 90 entries; the 13 weeks are the trailing 91 days, so the first is 6 days long.
    for (let end = 90; end > 0; end -= 7) {
      const week = parts.activity.daily.slice(Math.max(0, end - 7), end);
      if (week.some((d) => d.count > 0)) activeWeeks += 1;
    }
  }

  return {
    ...calculateRepositoryAge(dataset.repository.createdAt, now),
    archived: dataset.repository.archived,
    recency: [
      entry("push", "Last push to any branch", dataset.repository.pushedAt),
      entry("commit", "Last commit on the default branch", parts.activity.lastCommitAt),
      entry(
        "release",
        "Last published release",
        parts.releases.latest?.publishedAt ?? null,
      ),
      entry("merge", "Last merged pull request", parts.pulls.lastResolvedAt),
      entry("issue", "Last closed issue", parts.issues.lastResolvedAt),
    ],
    activeWeeks,
  };
}

/** Runs every calculation. Pure: the same dataset always yields the same analysis. */
export function analyze(dataset: Dataset): Analysis {
  const now = new Date(dataset.fetchedAt);
  const activity = calculateActivity(dataset.commits, now);
  const contributors = calculateContributors(dataset.commits, now);
  const releases = calculateReleaseCadence(dataset.releases, now);
  const openPulls = dataset.openPullRequests;
  const openIssues =
    openPulls === null
      ? null
      : Math.max(0, dataset.repository.openIssuesAndPulls - openPulls);
  const issues = calculateIssueSignals(dataset.issues, openIssues, now);
  const pulls = calculatePullRequestSignals(dataset.issues, openPulls, now);
  const maintenance = calculateMaintenanceSignals(
    dataset,
    { activity, releases, issues, pulls },
    now,
  );
  const contributing = calculateContributingSignals(
    dataset.issues,
    dataset.comments,
    dataset.starterIssues,
    dataset.community,
    now,
  );
  const stack = calculateStack(dataset.languages);
  return {
    activity,
    contributors,
    releases,
    issues,
    pulls,
    maintenance,
    contributing,
    stack,
  };
}
