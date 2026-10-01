import { analyze, type Analysis } from "@/lib/analysis";
import { DAY_MS } from "@/lib/analysis/time";
import { createGitHubClient, GitHubError, type GitHubClient } from "@/lib/github/client";
import {
  fetchComments,
  fetchCommits,
  fetchCommunityFiles,
  fetchContributors,
  fetchIssuesAndPulls,
  fetchOpenPullRequestCount,
  fetchReleases,
  fetchRepository,
  fetchStarterIssues,
} from "@/lib/github/fetchers";
import type { RepoRef } from "@/lib/github/parse";
import { buildFindings, type Finding } from "@/lib/insights/findings";
import type { Dataset, Repository } from "@/types";

export interface Report {
  repository: Repository;
  analysis: Analysis;
  findings: Finding[];
  fetchedAt: string;
  sample?: boolean;
}

export interface ReportError {
  code: "not_found" | "rate_limited" | "unavailable";
  title: string;
  message: string;
}

export type StageId =
  | "repository"
  | "commits"
  | "contributors"
  | "releases"
  | "issues"
  | "contributing"
  | "report";

export type AnalysisEvent =
  | { type: "stage"; stage: StageId; detail: string }
  | { type: "result"; report: Report }
  | { type: "error"; error: ReportError };

export function buildReport(dataset: Dataset): Report {
  const analysis = analyze(dataset);
  return {
    repository: dataset.repository,
    analysis,
    findings: buildFindings(dataset.repository, analysis),
    fetchedAt: dataset.fetchedAt,
  };
}

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
    const at = error.resetAt
      ? ` The limit resets at ${new Date(error.resetAt * 1000).toISOString().slice(11, 16)} UTC.`
      : "";
    return {
      code: "rate_limited",
      title: "GitHub rate limit reached",
      message: `GitHub's public API limit has been reached. Please try again later.${at}`,
    };
  }
  return {
    code: "unavailable",
    title: "GitHub is not responding",
    message:
      "We couldn't read this repository from GitHub right now. Please try again in a moment.",
  };
}

const count = (n: number, word: string) =>
  `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; report: Report }>();

export async function runAnalysis(
  ref: RepoRef,
  emit: (event: AnalysisEvent) => void,
  client: GitHubClient = createGitHubClient({ token: process.env.GITHUB_TOKEN }),
  now: Date = new Date(),
): Promise<void> {
  const key = `${ref.owner}/${ref.name}`.toLowerCase();
  const hit = cache.get(key);
  if (hit && now.getTime() - hit.at < CACHE_TTL_MS) {
    emit({ type: "result", report: hit.report });
    return;
  }

  try {
    const repository = await fetchRepository(client, ref);
    emit({ type: "stage", stage: "repository", detail: `Found ${repository.fullName}` });

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
      contributors,
      releases,
      issues,
      openPullRequests,
      [comments, starterIssues, community],
    ] = await Promise.all([
      fetchCommits(client, canonical, since, maxPages).then((c) => {
        emit({
          type: "stage",
          stage: "commits",
          detail:
            c.status === "ok"
              ? `${count(c.items.length, "commit")} collected`
              : "Unavailable",
        });
        return c;
      }),
      fetchContributors(client, canonical).then((c) => {
        emit({
          type: "stage",
          stage: "contributors",
          detail:
            c.status === "ok"
              ? `${count(c.items.length, "contributor")} listed`
              : "Unavailable",
        });
        return c;
      }),
      fetchReleases(client, canonical).then((r) => {
        emit({
          type: "stage",
          stage: "releases",
          detail:
            r.status === "ok"
              ? `${count(r.items.length, "release")} collected`
              : "Unavailable",
        });
        return r;
      }),
      fetchIssuesAndPulls(client, canonical, since, maxPages).then((i) => {
        emit({
          type: "stage",
          stage: "issues",
          detail:
            i.status === "ok"
              ? `${i.items.length.toLocaleString("en-US")} issues and pull requests collected`
              : "Unavailable",
        });
        return i;
      }),
      fetchOpenPullRequestCount(client, canonical),
      Promise.all([
        fetchComments(client, canonical, since, maxPages),
        fetchStarterIssues(client, canonical),
        fetchCommunityFiles(client, canonical),
      ]).then((result) => {
        emit({
          type: "stage",
          stage: "contributing",
          detail:
            result[1].status === "ok"
              ? `${count(result[1].items.length, "starter issue")}, ${count(result[0].items.length, "comment")}`
              : "Partly unavailable",
        });
        return result;
      }),
    ]);

    const report = buildReport({
      repository,
      commits,
      contributors,
      releases,
      issues,
      comments,
      starterIssues,
      community,
      openPullRequests,
      fetchedAt: now.toISOString(),
    });
    emit({
      type: "stage",
      stage: "report",
      detail: `${count(report.findings.length, "finding")}`,
    });

    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: now.getTime(), report });
    emit({ type: "result", report });
  } catch (error) {
    emit({ type: "error", error: toReportError(error) });
  }
}
