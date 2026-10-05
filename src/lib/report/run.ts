import { analyze, type Analysis } from "@/lib/analysis";
import { DAY_MS } from "@/lib/analysis/time";
import { GitHubError, type GitHubClient } from "@/lib/github/client";
import {
  fetchComments,
  fetchCommits,
  fetchCommunityFiles,
  fetchGuideTexts,
  fetchIssuesAndPulls,
  fetchLanguages,
  fetchOpenPullRequestCount,
  fetchReleases,
  fetchRepository,
  fetchStarterAvailability,
  fetchStarterIssues,
} from "@/lib/github/fetchers";
import type { RepoRef } from "@/lib/github/parse";
import { buildChecklist, type Checklist } from "@/lib/insights/checklist";
import { pullRequestPolicy } from "@/core/policy";
import type { Collection, Dataset, Repository, StarterIssue } from "@/types";

export interface Report {
  repository: Repository;
  analysis: Analysis;
  checklist: Checklist;
  fetchedAt: string;
  sample?: boolean;
  /** The project's own words against outside pull requests, when it has any. */
  policy?: string | null;
}

export interface ReportError {
  code: "not_found" | "rate_limited" | "unavailable";
  title: string;
  message: string;
}

export type StageId =
  "repository" | "commits" | "releases" | "issues" | "contributing" | "report";

export type AnalysisEvent =
  | { type: "stage"; stage: StageId; detail: string }
  | { type: "result"; report: Report }
  | { type: "error"; error: ReportError };

export function buildReport(dataset: Dataset): Report {
  const analysis = analyze(dataset);
  return {
    repository: dataset.repository,
    analysis,
    checklist: buildChecklist(dataset.repository, analysis, dataset.policy ?? null),
    fetchedAt: dataset.fetchedAt,
    policy: dataset.policy ?? null,
  };
}

/**
 * What a visitor sees when a report cannot be finished right now. It is never worded
 * as an error: the page keeps trying on its own.
 */
export const PREPARING = {
  title: "Preparing this report",
  message:
    "Lots of people are checking repositories right now. Leave this page open: it tries again on its own.",
};

export function toReportError(error: unknown): ReportError {
  if (error instanceof GitHubError && error.code === "not_found") {
    return {
      code: "not_found",
      title: "Repository not found",
      message:
        "We couldn't find that public repository. It may be private, renamed or misspelled. Check the URL and try again.",
    };
  }
  if (error instanceof GitHubError && error.code === "rate_limited") {
    return { code: "rate_limited", ...PREPARING };
  }
  return { code: "unavailable", ...PREPARING };
}

const count = (n: number, word: string) =>
  `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

// Each availability check costs one request, so only the issues a report shows get one.
const STARTERS_CHECKED = 4;

/** Finds out whether the first few unassigned starter issues are really free to take. */
async function checkAvailability(
  client: GitHubClient,
  ref: RepoRef,
  starter: Collection<StarterIssue>,
): Promise<Collection<StarterIssue>> {
  const shown = starter.items
    .filter((issue) => !issue.assigned)
    .slice(0, STARTERS_CHECKED);
  const checked = await Promise.all(
    shown.map(async (issue) => ({
      ...issue,
      availability: await fetchStarterAvailability(client, ref, issue),
    })),
  );
  const byNumber = new Map(checked.map((issue) => [issue.number, issue]));
  return { ...starter, items: starter.items.map((i) => byNumber.get(i.number) ?? i) };
}

/**
 * Reads a repository from GitHub and builds its report. It runs wherever `fetch` does:
 * on the server with the shared token, or in a visitor's browser on their own GitHub
 * allowance. Throws a GitHubError when the repository cannot be read at all.
 */
export async function analyzeRepository(
  ref: RepoRef,
  client: GitHubClient,
  onStage: (stage: StageId, detail: string) => void = () => {},
  now: Date = new Date(),
): Promise<Report> {
  const emit = (event: { type: "stage"; stage: StageId; detail: string }) =>
    onStage(event.stage, event.detail);
  {
    const repository = await fetchRepository(client, ref);
    emit({ type: "stage", stage: "repository", detail: "found" });

    // Use the canonical name: GitHub follows redirects for renamed repositories.
    const canonical = { owner: repository.owner, name: repository.name };
    // Anchor the fetch window to a UTC day so repeated analyses request identical URLs.
    const since = new Date(
      Math.floor((now.getTime() - 90 * DAY_MS) / DAY_MS) * DAY_MS,
    ).toISOString();
    // Unauthenticated requests are limited to 60 per hour, so collect less.
    const maxPages = client.authenticated ? 10 : 3;

    const [
      commits,
      releases,
      issues,
      openPullRequests,
      [comments, starterIssues, community, languages],
    ] = await Promise.all([
      fetchCommits(client, canonical, since, maxPages).then((c) => {
        emit({
          type: "stage",
          stage: "commits",
          detail: c.status === "ok" ? count(c.items.length, "commit") : "unavailable",
        });
        return c;
      }),
      fetchReleases(client, canonical).then((r) => {
        emit({
          type: "stage",
          stage: "releases",
          detail: r.status === "ok" ? count(r.items.length, "release") : "unavailable",
        });
        return r;
      }),
      fetchIssuesAndPulls(client, canonical, since, maxPages).then((i) => {
        emit({
          type: "stage",
          stage: "issues",
          detail: i.status === "ok" ? count(i.items.length, "thread") : "unavailable",
        });
        return i;
      }),
      fetchOpenPullRequestCount(client, canonical),
      Promise.all([
        fetchComments(client, canonical, since, maxPages),
        fetchStarterIssues(client, canonical).then((starter) =>
          checkAvailability(client, canonical, starter),
        ),
        fetchCommunityFiles(client, canonical),
        fetchLanguages(client, canonical),
      ]).then((result) => {
        emit({
          type: "stage",
          stage: "contributing",
          detail:
            result[0].status === "ok"
              ? count(result[0].items.length, "comment")
              : "partly unavailable",
        });
        return result;
      }),
    ]);
    // Read after the community profile, which says where the contributing guide lives.
    const guideTexts = await fetchGuideTexts(
      client,
      canonical,
      community?.contributing ?? null,
    );

    const report = buildReport({
      repository,
      commits,
      releases,
      issues,
      comments,
      starterIssues,
      community,
      languages,
      openPullRequests,
      policy: pullRequestPolicy(guideTexts),
      fetchedAt: now.toISOString(),
    });
    emit({
      type: "stage",
      stage: "report",
      detail: `${report.checklist.favourable} of ${report.checklist.checks.length} signals`,
    });

    return report;
  }
}
