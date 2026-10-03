import { createHmac } from "node:crypto";
import { classify, isBot, isHumanResponse, type Actor } from "../actors";
import { SCHEMA_VERSION, type IssueSummary, type PullSummary, type RepoFacts, type RepoState } from "../schema";
import { detectChannels, detectFrameworks, detectSignOff } from "../stack";
import { isClaimComment, starterLabelClass } from "../starter";
import type { GraphQLClient } from "./client";
import { GitHubError } from "./client";
import { ISSUES, PULLS, REPO_FACTS, STARTER_ISSUES } from "./queries";

const DAY_MS = 86_400_000;
export const BACKFILL_DAYS = 365;

interface RawActor {
  __typename: string;
  login: string;
}
interface RawReply {
  createdAt?: string;
  submittedAt?: string | null;
  authorAssociation: string;
  author: RawActor | null;
  bodyText?: string;
}
interface RawPull {
  number: number;
  createdAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  updatedAt: string;
  authorAssociation: string;
  author: RawActor | null;
  mergedBy: RawActor | null;
  comments: { totalCount: number; nodes: RawReply[] };
  reviews: { nodes: RawReply[] };
}
interface RawIssue {
  number: number;
  title: string;
  createdAt: string;
  closedAt: string | null;
  updatedAt: string;
  authorAssociation: string;
  author: RawActor | null;
  labels: { nodes: { name: string }[] };
  assignees: { totalCount: number };
  comments: { totalCount: number; nodes: RawReply[] };
}
interface RawLinked {
  __typename: string;
  willCloseTarget?: boolean;
  source?: { __typename: string; number?: number; state?: string };
  subject?: { __typename: string; number?: number; state?: string };
}
interface RawStarter extends RawIssue {
  timelineItems: { nodes: RawLinked[] };
}
interface Page<T> {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: T[];
}
type Blob = { text?: string | null; isTruncated?: boolean } | null;

export interface FetchOptions {
  /** Key for the one-way author hash. Keep it secret when the state is published. */
  hashKey: string;
  now?: Date;
  /** Hard stop on pages per list, so one enormous repository cannot drain the budget. */
  maxPages?: number;
}

const toActor = (raw: RawActor | null, association?: string): Actor => ({
  login: raw?.login ?? null,
  typename: raw?.__typename ?? null,
  association: association ?? null,
});

function hasher(key: string) {
  return (login: string) =>
    createHmac("sha256", key).update(login.toLowerCase()).digest("hex").slice(0, 12);
}

interface ReplySummary {
  firstResponseAt: string | null;
  coreReplyAt: string[];
  coreActors: string[];
}

function summariseReplies(
  replies: RawReply[],
  author: string | null,
  hash: (login: string) => string,
): ReplySummary {
  let first: string | null = null;
  const coreReplyAt: string[] = [];
  const coreActors = new Set<string>();
  for (const reply of replies) {
    const at = reply.createdAt ?? reply.submittedAt;
    if (!at) continue;
    const actor = toActor(reply.author, reply.authorAssociation);
    if (!isHumanResponse(actor, author)) continue;
    if (first === null || at < first) first = at;
    if (classify(actor) === "core" && actor.login) {
      coreReplyAt.push(at);
      coreActors.add(hash(actor.login));
    }
  }
  return { firstResponseAt: first, coreReplyAt: coreReplyAt.sort(), coreActors: [...coreActors] };
}

export function toPullSummary(raw: RawPull, hash: (login: string) => string): PullSummary {
  const author = raw.author?.login ?? null;
  const replies = summariseReplies([...raw.comments.nodes, ...raw.reviews.nodes], author, hash);
  const actors = new Set(replies.coreActors);
  // Merging needs write access, so a human who merged someone else's work counts as core.
  if (raw.mergedBy && !isBot(toActor(raw.mergedBy)) && raw.mergedBy.login !== author) {
    actors.add(hash(raw.mergedBy.login));
  }
  return {
    n: raw.number,
    createdAt: raw.createdAt,
    closedAt: raw.closedAt,
    mergedAt: raw.mergedAt,
    updatedAt: raw.updatedAt,
    cls: classify(toActor(raw.author, raw.authorAssociation)),
    author: author ? hash(author) : null,
    firstResponseAt: replies.firstResponseAt,
    coreReplyAt: replies.coreReplyAt,
    coreActors: [...actors],
  };
}

export function toIssueSummary(raw: RawIssue, hash: (login: string) => string): IssueSummary {
  const author = raw.author?.login ?? null;
  const replies = summariseReplies(raw.comments.nodes, author, hash);
  return {
    n: raw.number,
    title: raw.title.slice(0, 160),
    createdAt: raw.createdAt,
    closedAt: raw.closedAt,
    updatedAt: raw.updatedAt,
    cls: classify(toActor(raw.author, raw.authorAssociation)),
    author: author ? hash(author) : null,
    firstResponseAt: replies.firstResponseAt,
    labels: raw.labels.nodes.map((l) => l.name),
    assignees: raw.assignees.totalCount,
    linkedOpenPulls: 0,
    lastClaimAt: null,
    coreReplyAt: replies.coreReplyAt,
    coreActors: replies.coreActors,
  };
}

/** Open pull requests still linked to an issue, and its most recent claim comment. */
export function starterSignals(raw: RawStarter): { linkedOpenPulls: number; lastClaimAt: string | null } {
  const open = new Set<number>();
  for (const event of raw.timelineItems.nodes) {
    const target = event.source ?? event.subject;
    if (!target || target.__typename !== "PullRequest" || target.number === undefined) continue;
    if (event.__typename === "DisconnectedEvent") open.delete(target.number);
    else if (target.state === "OPEN") open.add(target.number);
  }
  let lastClaimAt: string | null = null;
  for (const comment of raw.comments.nodes) {
    if (!comment.createdAt || isBot(toActor(comment.author))) continue;
    if (comment.bodyText && isClaimComment(comment.bodyText)) {
      if (lastClaimAt === null || comment.createdAt > lastClaimAt) lastClaimAt = comment.createdAt;
    }
  }
  return { linkedOpenPulls: open.size, lastClaimAt };
}

interface FactsResult {
  facts: RepoFacts;
  starterLabels: string[];
}

export async function fetchFacts(
  client: GraphQLClient,
  owner: string,
  name: string,
  now: Date,
  botLogins: readonly string[] = [],
): Promise<FactsResult> {
  const since90 = new Date(now.getTime() - 90 * DAY_MS).toISOString();
  const data = await client.query<{ repository: Record<string, unknown> | null }>(REPO_FACTS, {
    owner,
    name,
    since90,
  });
  const repo = data.repository;
  if (!repo) throw new GitHubError(`${owner}/${name} not found`, "not-found");
  if (repo.isPrivate) throw new GitHubError(`${owner}/${name} is private`, "forbidden");

  const text = (key: string) => (repo[key] as Blob)?.text ?? null;
  const exists = (key: string) => repo[key] !== null && repo[key] !== undefined;
  const [realOwner, realName] = String(repo.nameWithOwner).split("/");

  const languages: Record<string, number> = {};
  for (const edge of (repo.languages as { edges: { size: number; node: { name: string } }[] }).edges) {
    languages[edge.node.name] = edge.size;
  }
  const releases = (
    repo.releases as { nodes: { publishedAt: string | null; isPrerelease: boolean; isDraft: boolean }[] }
  ).nodes.filter((r) => !r.isDraft && r.publishedAt);
  const yearAgo = now.getTime() - 365 * DAY_MS;
  const branch = repo.defaultBranchRef as { name: string; target?: { history?: { totalCount: number } } } | null;

  const contributing =
    text("contributing") ?? text("contributingGithub") ?? text("contributingDocs") ?? text("contributingRst");
  const readme = text("readme") ?? text("readmeRst");
  const labels = (repo.labels as { nodes: { name: string }[] }).nodes.map((l) => l.name);

  const facts: RepoFacts = {
    owner: realOwner,
    name: realName,
    description: (repo.description as string | null) ?? null,
    stars: repo.stargazerCount as number,
    forks: repo.forkCount as number,
    archived: repo.isArchived as boolean,
    isFork: repo.isFork as boolean,
    license: (repo.licenseInfo as { spdxId: string | null } | null)?.spdxId ?? null,
    defaultBranch: branch?.name ?? null,
    pushedAt: (repo.pushedAt as string | null) ?? null,
    createdAt: repo.createdAt as string,
    topics: (repo.repositoryTopics as { nodes: { topic: { name: string } }[] }).nodes.map((t) => t.topic.name),
    languages,
    frameworks: detectFrameworks({
      packageJson: text("packageJson"),
      pyproject: text("pyproject"),
      requirements: text("requirements"),
      goMod: text("goMod"),
      cargo: text("cargo"),
      pom: text("pom"),
      gradle: text("gradle") ?? text("gradleKts"),
      gemfile: text("gemfile"),
      composer: text("composer"),
    }),
    commits90d: branch?.target?.history?.totalCount ?? null,
    releases365d: releases.filter((r) => Date.parse(r.publishedAt as string) >= yearAgo).length,
    lastReleaseAt: releases[0]?.publishedAt ?? null,
    gettingStarted: {
      contributing: contributing !== null,
      codeOfConduct: exists("codeOfConduct"),
      issueTemplates: exists("issueTemplateDir"),
      devcontainer: exists("devcontainer") || exists("devcontainerJson"),
      cla: detectSignOff({ documents: [contributing, readme], hasDcoConfig: exists("dco"), botLogins }),
      channels: detectChannels(contributing, readme),
    },
  };
  return { facts, starterLabels: labels.filter((l) => starterLabelClass(l) !== null) };
}

async function paginate<T>(
  client: GraphQLClient,
  query: string,
  variables: Record<string, unknown>,
  pick: (data: never) => Page<T>,
  keepGoing: (page: T[]) => boolean,
  maxPages: number,
): Promise<{ items: T[]; complete: boolean }> {
  const items: T[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < maxPages; page += 1) {
    const data: unknown = await client.query(query, { ...variables, cursor });
    const connection = pick(data as never);
    items.push(...connection.nodes);
    if (!connection.pageInfo.hasNextPage || !keepGoing(connection.nodes)) {
      return { items, complete: true };
    }
    cursor = connection.pageInfo.endCursor;
  }
  return { items, complete: false };
}

/**
 * Fetches a repository. With no previous state this is the backfill: a year of pull
 * requests and issues. With previous state it reads only what changed since the last
 * sync and merges it in.
 */
export async function fetchRepo(
  client: GraphQLClient,
  owner: string,
  name: string,
  options: FetchOptions,
  previous?: RepoState,
): Promise<RepoState> {
  const now = options.now ?? new Date();
  const hash = hasher(options.hashKey);
  const horizon = new Date(now.getTime() - BACKFILL_DAYS * DAY_MS).toISOString();
  const since = previous?.syncedAt ?? horizon;
  const maxPages = options.maxPages ?? (previous ? 10 : 60);

  const { facts, starterLabels } = await fetchFacts(client, owner, name, now);
  const vars = { owner: facts.owner, name: facts.name };

  const pulls = await paginate<RawPull>(
    client,
    PULLS,
    vars,
    (d: { repository: { pullRequests: Page<RawPull> } }) => d.repository.pullRequests,
    (page) => page.length > 0 && page[page.length - 1].updatedAt >= since,
    maxPages,
  );
  const issues = await paginate<RawIssue>(
    client,
    ISSUES,
    { ...vars, since },
    (d: { repository: { issues: Page<RawIssue> } }) => d.repository.issues,
    () => true,
    maxPages,
  );

  const pullMap = new Map<number, PullSummary>((previous?.pulls ?? []).map((p) => [p.n, p]));
  for (const raw of pulls.items) {
    if (raw.updatedAt >= since || !pullMap.has(raw.number)) {
      pullMap.set(raw.number, toPullSummary(raw, hash));
    }
  }
  const issueMap = new Map<number, IssueSummary>((previous?.issues ?? []).map((i) => [i.n, i]));
  for (const raw of issues.items) issueMap.set(raw.number, toIssueSummary(raw, hash));

  // Starter signals are re-read every time: a claim or a linked pull request can
  // appear without the label list changing.
  if (starterLabels.length > 0) {
    const starters = await paginate<RawStarter>(
      client,
      STARTER_ISSUES,
      { ...vars, labels: starterLabels },
      (d: { repository: { issues: Page<RawStarter> } }) => d.repository.issues,
      () => true,
      4,
    );
    const seen = new Set<number>();
    for (const raw of starters.items) {
      seen.add(raw.number);
      // An old open issue untouched for a year is not in the main list; add it here.
      const issue = issueMap.get(raw.number) ?? toIssueSummary(raw, hash);
      issueMap.set(raw.number, { ...issue, ...starterSignals(raw) });
    }
    for (const issue of issueMap.values()) {
      if (!seen.has(issue.n) && (issue.linkedOpenPulls > 0 || issue.lastClaimAt !== null) && starters.complete) {
        issueMap.set(issue.n, { ...issue, linkedOpenPulls: 0, lastClaimAt: null });
      }
    }
  }

  // Drop what has aged out of the year, except open issues, which stay listed.
  const keepPull = (p: PullSummary) => p.createdAt >= horizon;
  const keepIssue = (i: IssueSummary) => i.createdAt >= horizon || i.closedAt === null;

  return {
    schemaVersion: SCHEMA_VERSION,
    facts,
    pulls: [...pullMap.values()].filter(keepPull).sort((a, b) => b.n - a.n),
    issues: [...issueMap.values()].filter(keepIssue).sort((a, b) => b.n - a.n),
    syncedAt: now.toISOString(),
    coveredSince: previous?.coveredSince ?? horizon,
  };
}
