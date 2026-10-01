import type {
  Collection,
  Commit,
  Contributor,
  IssueItem,
  Release,
  Repository,
} from "@/types";
import { GitHubError, type GitHubClient } from "./client";
import type { RepoRef } from "./parse";

/* eslint-disable @typescript-eslint/no-explicit-any -- raw GitHub payloads are narrowed field by field */
type Raw = Record<string, any>;

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const isBot = (user: Raw | null | undefined): boolean =>
  user?.type === "Bot" || /\[bot\]$/.test(user?.login ?? "");

export function normalizeRepository(raw: Raw): Repository {
  const spdx = raw.license?.spdx_id;
  return {
    owner: raw.owner?.login ?? "",
    name: raw.name ?? "",
    fullName: raw.full_name ?? "",
    description: str(raw.description),
    url: raw.html_url ?? "",
    language: str(raw.language),
    stars: num(raw.stargazers_count),
    forks: num(raw.forks_count),
    openIssuesAndPulls: num(raw.open_issues_count),
    license: spdx && spdx !== "NOASSERTION" ? spdx : str(raw.license?.name),
    topics: Array.isArray(raw.topics)
      ? raw.topics.filter((t) => typeof t === "string")
      : [],
    defaultBranch: raw.default_branch ?? "main",
    createdAt: raw.created_at,
    pushedAt: str(raw.pushed_at),
    archived: Boolean(raw.archived),
    fork: Boolean(raw.fork),
  };
}

export function normalizeCommit(raw: Raw): Commit | null {
  const date = raw.commit?.committer?.date ?? raw.commit?.author?.date;
  if (!raw.sha || !date) return null;
  return {
    sha: raw.sha,
    date,
    author: str(raw.author?.login) ?? str(raw.commit?.author?.name) ?? "Unknown author",
    isBot: isBot(raw.author),
    url: raw.html_url ?? "",
  };
}

export function normalizeIssue(raw: Raw): IssueItem | null {
  if (typeof raw.number !== "number" || !raw.created_at) return null;
  return {
    number: raw.number,
    title: String(raw.title ?? "").slice(0, 120),
    isPullRequest: Boolean(raw.pull_request) || "merged_at" in raw,
    createdAt: raw.created_at,
    closedAt: str(raw.closed_at),
    mergedAt: str(raw.pull_request?.merged_at ?? raw.merged_at),
    author: str(raw.user?.login),
    url: raw.html_url ?? "",
  };
}

export async function fetchRepository(
  client: GitHubClient,
  ref: RepoRef,
): Promise<Repository> {
  const { data } = await client.get<Raw>(`/repos/${ref.owner}/${ref.name}`);
  return normalizeRepository(data);
}

function unavailable<T>(note: string): Collection<T> {
  return { status: "unavailable", items: [], complete: false, coveredSince: null, note };
}

/** Rate limits abort the whole analysis; any other failure only degrades one section. */
function rethrowFatal(error: unknown): void {
  if (error instanceof GitHubError && error.code === "rate_limited") throw error;
}

async function fetchList<T>(
  client: GitHubClient,
  path: string,
  params: Record<string, string | number>,
  maxPages: number,
  since: string,
  map: (raw: Raw) => T | null,
  sortDate: (raw: Raw) => string | undefined,
): Promise<Collection<T>> {
  const items: T[] = [];
  let oldest: string | null = null;
  let hasNext = true;
  for (let page = 1; hasNext && page <= maxPages; page++) {
    const res = await client.get<Raw[]>(path, { ...params, per_page: 100, page });
    const rows = Array.isArray(res.data) ? res.data : [];
    for (const raw of rows) {
      const item = map(raw);
      if (item) items.push(item);
    }
    oldest = sortDate(rows[rows.length - 1] ?? {}) ?? oldest;
    hasNext = res.hasNext && rows.length > 0;
    // Lists without a `since` filter are walked until they pass the window start.
    if (oldest && oldest < since) hasNext = false;
  }
  return {
    status: "ok",
    items,
    complete: !hasNext,
    coveredSince: hasNext ? oldest : since,
  };
}

export async function fetchCommits(
  client: GitHubClient,
  ref: RepoRef,
  since: string,
  maxPages: number,
): Promise<Collection<Commit>> {
  const path = `/repos/${ref.owner}/${ref.name}/commits`;
  try {
    const result = await fetchList(
      client,
      path,
      { since },
      maxPages,
      since,
      normalizeCommit,
      (raw) => raw.commit?.committer?.date,
    );
    if (result.items.length > 0) return result;
    // Nothing inside the window: read the single latest commit so recency is still known.
    const latest = await client.get<Raw[]>(path, { per_page: 1 });
    const commit = Array.isArray(latest.data)
      ? normalizeCommit(latest.data[0] ?? {})
      : null;
    return { ...result, items: commit ? [commit] : [] };
  } catch (error) {
    rethrowFatal(error);
    if (error instanceof GitHubError && error.code === "empty") {
      return {
        status: "ok",
        items: [],
        complete: true,
        coveredSince: since,
        note: "empty",
      };
    }
    return unavailable("GitHub did not return commit history for this repository.");
  }
}

export async function fetchContributors(
  client: GitHubClient,
  ref: RepoRef,
): Promise<Collection<Contributor>> {
  try {
    const res = await client.get<Raw[]>(`/repos/${ref.owner}/${ref.name}/contributors`, {
      per_page: 100,
    });
    const items = (Array.isArray(res.data) ? res.data : [])
      .filter((raw) => typeof raw.login === "string")
      .map((raw) => ({
        login: raw.login as string,
        contributions: num(raw.contributions),
        isBot: isBot(raw),
      }));
    return { status: "ok", items, complete: !res.hasNext, coveredSince: null };
  } catch (error) {
    rethrowFatal(error);
    return unavailable(
      error instanceof GitHubError && error.code === "too_large"
        ? "GitHub does not list contributors for repositories with very large histories."
        : "GitHub did not return a contributor list for this repository.",
    );
  }
}

export async function fetchReleases(
  client: GitHubClient,
  ref: RepoRef,
): Promise<Collection<Release>> {
  try {
    const res = await client.get<Raw[]>(`/repos/${ref.owner}/${ref.name}/releases`, {
      per_page: 100,
    });
    const items = (Array.isArray(res.data) ? res.data : [])
      .filter((raw) => !raw.draft && typeof raw.published_at === "string")
      .map((raw) => ({
        tag: String(raw.tag_name ?? ""),
        publishedAt: raw.published_at as string,
        prerelease: Boolean(raw.prerelease),
        url: raw.html_url ?? "",
      }))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return { status: "ok", items, complete: !res.hasNext, coveredSince: null };
  } catch (error) {
    rethrowFatal(error);
    return unavailable("GitHub did not return release history for this repository.");
  }
}

/**
 * Issues and pull requests updated since `since`, most recently updated first. Anything
 * created, closed or merged inside the window was necessarily updated inside it, so one
 * list covers every event the analysis needs.
 */
export async function fetchIssuesAndPulls(
  client: GitHubClient,
  ref: RepoRef,
  since: string,
  maxPages: number,
): Promise<Collection<IssueItem>> {
  const base = `/repos/${ref.owner}/${ref.name}`;
  const sort = { state: "all", sort: "updated", direction: "desc" };
  const updated = (raw: Raw) => raw.updated_at;
  try {
    return await fetchList(
      client,
      `${base}/issues`,
      { ...sort, since },
      maxPages,
      since,
      normalizeIssue,
      updated,
    );
  } catch (error) {
    rethrowFatal(error);
    if (!(error instanceof GitHubError && error.code === "gone")) {
      return unavailable(
        "GitHub did not return issues or pull requests for this repository.",
      );
    }
  }
  // Issues are disabled (410 Gone). Pull requests still have their own endpoint.
  try {
    const pulls = await fetchList(
      client,
      `${base}/pulls`,
      sort,
      maxPages,
      since,
      normalizeIssue,
      updated,
    );
    return { ...pulls, note: "issues_disabled" };
  } catch (error) {
    rethrowFatal(error);
    return unavailable("GitHub did not return pull requests for this repository.");
  }
}

/** Exact number of open pull requests, read from the pagination header of a 1-item page. */
export async function fetchOpenPullRequestCount(
  client: GitHubClient,
  ref: RepoRef,
): Promise<number | null> {
  try {
    const res = await client.get<Raw[]>(`/repos/${ref.owner}/${ref.name}/pulls`, {
      state: "open",
      per_page: 1,
    });
    return res.lastPage ?? (Array.isArray(res.data) ? res.data.length : null);
  } catch (error) {
    rethrowFatal(error);
    return null;
  }
}
