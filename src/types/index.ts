export interface Repository {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  /** GitHub's open_issues_count, which includes open pull requests. */
  openIssuesAndPulls: number;
  license: string | null;
  topics: string[];
  defaultBranch: string;
  createdAt: string;
  pushedAt: string | null;
  archived: boolean;
  fork: boolean;
}

export interface Commit {
  sha: string;
  date: string;
  /** GitHub login when the commit is linked to an account, otherwise the git author name. */
  author: string;
  isBot: boolean;
  url: string;
}

export interface Contributor {
  login: string;
  contributions: number;
  isBot: boolean;
}

export interface Release {
  tag: string;
  publishedAt: string;
  prerelease: boolean;
  url: string;
}

export interface IssueItem {
  number: number;
  title: string;
  isPullRequest: boolean;
  createdAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  author: string | null;
  url: string;
}

/**
 * A list fetched from GitHub plus how much of it we actually hold. `complete` is false
 * when the collection limit was reached; `coveredSince` is the earliest instant for
 * which the list is known to be complete.
 */
export interface Collection<T> {
  status: "ok" | "unavailable";
  items: T[];
  complete: boolean;
  coveredSince: string | null;
  note?: string;
}

export interface Dataset {
  repository: Repository;
  commits: Collection<Commit>;
  contributors: Collection<Contributor>;
  releases: Collection<Release>;
  issues: Collection<IssueItem>;
  openPullRequests: number | null;
  fetchedAt: string;
}

export const WINDOWS = [7, 30, 90] as const;
export type WindowDays = (typeof WINDOWS)[number];
