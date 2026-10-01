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
  /** GitHub login, when the commit is linked to an account. */
  login: string | null;
  isBot: boolean;
  /** Issue and pull request numbers the commit message mentions. */
  refs: number[];
  /** Logins credited with a Co-authored-by trailer, lower case. */
  coAuthors: string[];
  url: string;
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
  association: Association;
  labels: string[];
  url: string;
}

/**
 * How GitHub relates an author to the repository. "team" covers owners, organisation
 * members and collaborators; everyone else who is not a bot is "community".
 */
export type Association = "team" | "community" | "bot";

/** A comment on an issue or pull request conversation. */
export interface ThreadComment {
  issueNumber: number;
  createdAt: string;
  author: string | null;
  association: Association;
}

/** An open issue carrying a label that invites new contributors. */
export interface StarterIssue {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  comments: number;
  assigned: boolean;
  label: string;
  /** Opened by an owner, organisation member or collaborator. */
  byMaintainer: boolean;
  /** Whether anyone seems to be on it already; "unchecked" when we did not look. */
  availability: StarterAvailability;
}

export type StarterAvailability =
  | { state: "unchecked" }
  | { state: "free" }
  | { state: "linked"; pullRequest: number; url: string }
  | { state: "claimed"; by: string | null; at: string };

/** Community files GitHub detects for a repository; a null URL means not detected. */
export interface CommunityFiles {
  readme: string | null;
  contributing: string | null;
  codeOfConduct: string | null;
  license: string | null;
  issueTemplate: string | null;
  pullRequestTemplate: string | null;
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
  releases: Collection<Release>;
  issues: Collection<IssueItem>;
  comments: Collection<ThreadComment>;
  starterIssues: Collection<StarterIssue>;
  community: CommunityFiles | null;
  /** Bytes of code per language, as GitHub reports them. Null when unavailable. */
  languages: Record<string, number> | null;
  openPullRequests: number | null;
  fetchedAt: string;
}

export const WINDOWS = [7, 30, 90] as const;
export type WindowDays = (typeof WINDOWS)[number];
