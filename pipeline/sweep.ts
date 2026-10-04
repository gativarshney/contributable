/**
 * The sweep. Each run refreshes as many repositories as the hourly GitHub budget and
 * the time limit allow, stalest first, then rewrites the published files:
 *
 *   universe.json            every repository in the index and why it is there
 *   state/<owner>/<name>.json.gz   what a later refresh needs to avoid refetching
 *   repos/<owner>/<name>.json      everything the repo page shows
 *   index.json               one row per repository, for search and rankings
 *   issues.json              starter issues that are truly available
 *   status.json              freshness, coverage and the last run
 *
 * Paths are lower case so a URL in any casing finds its file.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { createClient, GitHubError } from "../src/core/github/client";
import { fetchRepo } from "../src/core/github/fetch";
import { computeMetrics } from "../src/core/metrics";
import {
  availableIssues,
  PUBLISHED_VERSION,
  thinCurve,
  toIndexRow,
  type AvailableIssue,
  type IndexRow,
  type RepoDetail,
  type SweepStatus,
  type UniverseRepo,
} from "../src/core/published";
import { repoState, type RepoState } from "../src/core/schema";
import { trend, weeklySeries } from "../src/core/trends";
import { discoverUniverse, MAX_REPOS_PER_ACCOUNT } from "./universe/discover";
import type { GsocOrg } from "./universe/gsoc";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Programme repositories are refreshed once they are this old, so none passes two days. */
const PROGRAM_DUE_HOURS = 36;
const UNIVERSE_DUE_DAYS = 7;
/** A repository that could not be read is left alone for this long. */
const RETRY_AFTER_HOURS = 24;
/** Points kept in hand so a run never ends on a rate limit error. */
const RESERVE_REFRESH = 40;
const RESERVE_BACKFILL = 160;

const DATA_DIR = process.env.DATA_DIR ?? "out/data";
const MAX_MINUTES = Number(process.env.SWEEP_MINUTES ?? 40);
const MAX_REPOS = Number(process.env.SWEEP_MAX_REPOS ?? Infinity);
/** Repositories read at the same time. GitHub asks clients to keep concurrency low. */
const WORKERS = Number(process.env.SWEEP_WORKERS ?? 6);

interface UniverseFile {
  v: number;
  generatedAt: string;
  complete: boolean;
  /** Fingerprint of the organisation list this was built from. */
  source?: string;
  missing: string[];
  repos: UniverseRepo[];
}

type Failures = Record<string, { reason: string; at: string }>;

const idOf = (repo: { owner: string; name: string }) => `${repo.owner}/${repo.name}`;
const pathOf = (kind: "state" | "repos", id: string) =>
  join(DATA_DIR, kind, `${id.toLowerCase()}.json${kind === "state" ? ".gz" : ""}`);

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Writes through a temporary file, so a killed run never leaves half a file. */
async function writeAtomic(path: string, body: string | Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, body);
  await rename(`${path}.tmp`, path);
}

async function readState(id: string): Promise<RepoState | undefined> {
  try {
    const raw = gunzipSync(await readFile(pathOf("state", id))).toString("utf8");
    const parsed = repoState.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

async function listDetails(): Promise<RepoDetail[]> {
  const root = join(DATA_DIR, "repos");
  const details: RepoDetail[] = [];
  let owners: string[] = [];
  try {
    owners = await readdir(root);
  } catch {
    return details;
  }
  for (const owner of owners) {
    for (const file of await readdir(join(root, owner))) {
      if (!file.endsWith(".json")) continue;
      const detail = await readJson<RepoDetail>(join(root, owner, file));
      if (detail && detail.v === PUBLISHED_VERSION) details.push(detail);
    }
  }
  return details;
}

function toDetail(state: RepoState, repo: UniverseRepo, now: Date): RepoDetail {
  const metrics = computeMetrics(state.pulls, state.issues, now);
  metrics.pullFirstResponse.curve = thinCurve(metrics.pullFirstResponse.curve);
  metrics.issueFirstResponse.curve = thinCurve(metrics.issueFirstResponse.curve);
  return {
    v: PUBLISHED_VERSION,
    owner: state.facts.owner,
    name: state.facts.name,
    updatedAt: state.syncedAt,
    coveredSince: state.coveredSince,
    facts: state.facts,
    metrics,
    series: weeklySeries(state.pulls, now),
    trend: trend(state.pulls, now),
    programs: repo.programs,
  };
}

async function main() {
  const token = process.env.SWEEP_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("no GitHub token in the environment");
  const hashKey = process.env.SWEEP_HASH_KEY || "contributable";
  const startedAt = new Date();
  const deadline = startedAt.getTime() + MAX_MINUTES * 60_000;

  const client = createClient({ token, userAgent: "contributable-sweep" });
  const remaining = () => client.budget.last?.remaining ?? Infinity;
  const outOfTime = () => Date.now() >= deadline;

  // 1. The universe: rebuilt weekly, or straight away when the last build was cut short.
  let universe = await readJson<UniverseFile>(join(DATA_DIR, "universe.json"));
  const universeAge = universe
    ? startedAt.getTime() - Date.parse(universe.generatedAt)
    : Infinity;
  // A change to the organisation list (a corrected mapping, say) or to how many
  // repositories are taken per account also rebuilds it.
  const orgsText = await readFile("universe/gsoc.json", "utf8");
  const source = createHash("sha256")
    .update(orgsText + MAX_REPOS_PER_ACCOUNT)
    .digest("hex")
    .slice(0, 16);
  if (
    !universe ||
    !universe.complete ||
    universe.source !== source ||
    universeAge > UNIVERSE_DUE_DAYS * DAY_MS
  ) {
    const orgs = JSON.parse(orgsText) as GsocOrg[];
    const found = await discoverUniverse(
      client,
      orgs,
      startedAt,
      () => remaining() < RESERVE_REFRESH || outOfTime(),
    );
    // A cut-short build must not shrink a complete list that already exists.
    if (found.complete || !universe) {
      universe = {
        v: PUBLISHED_VERSION,
        generatedAt: startedAt.toISOString(),
        complete: found.complete,
        source,
        missing: found.missing,
        repos: found.repos,
      };
      await writeAtomic(join(DATA_DIR, "universe.json"), JSON.stringify(universe));
    }
    console.log(
      `universe: ${found.repos.length} repositories, complete=${found.complete}, ` +
        `${found.missing.length} accounts not found`,
    );
  }

  // Maintainers can ask for a repository or a whole account to be left out. The list
  // holds "owner" or "owner/name"; anything on it is neither fetched nor published.
  const optedOut = new Set(
    ((await readJson<string[]>("universe/opt-out.json")) ?? []).map((entry) =>
      entry.toLowerCase(),
    ),
  );
  universe.repos = universe.repos.filter(
    (repo) =>
      !optedOut.has(repo.owner.toLowerCase()) && !optedOut.has(idOf(repo).toLowerCase()),
  );

  // 2. The queue: never indexed first (newest programme year first), then stalest.
  const failures = (await readJson<Failures>(join(DATA_DIR, "failures.json"))) ?? {};
  const known = new Map(
    (await listDetails()).map((d) => [idOf(d).toLowerCase(), d.updatedAt]),
  );
  // Repositories listed by hand, outside any programme: this project itself, for one.
  const listed = new Set(universe.repos.map((repo) => idOf(repo).toLowerCase()));
  for (const entry of (await readJson<string[]>("universe/extra.json")) ?? []) {
    const [owner, name] = entry.split("/");
    if (!owner || !name || listed.has(entry.toLowerCase())) continue;
    if (optedOut.has(owner.toLowerCase()) || optedOut.has(entry.toLowerCase())) continue;
    universe.repos.push({ owner, name, programs: [] });
  }

  // Stored results written under older rules are re-read now, not when they fall due.
  const outdated = new Set<string>();
  for (const id of known.keys()) {
    if (!(await readState(id))) outdated.add(id);
  }
  const latestYear = (repo: UniverseRepo) =>
    Math.max(0, ...repo.programs.flatMap((p) => p.years));
  // A repository's place within its own account, most starred first. Reading rank 0
  // of every account before any rank 1 puts every organisation on the site early,
  // instead of finishing the alphabet's first accounts while the rest wait.
  const rank = new Map<string, number>();
  const perOwner = new Map<string, number>();
  for (const repo of universe.repos) {
    const owner = repo.owner.toLowerCase();
    rank.set(idOf(repo).toLowerCase(), perOwner.get(owner) ?? 0);
    perOwner.set(owner, (perOwner.get(owner) ?? 0) + 1);
  }
  const rankOf = (repo: UniverseRepo) => rank.get(idOf(repo).toLowerCase()) ?? 0;
  // Results under older rules are re-read fastest published reply first. A reply that
  // looks very fast is the likeliest to be a bot the newer rules catch, and those
  // repositories sit at the top of every list on the site.
  const published = await readJson<{ rows: IndexRow[] }>(join(DATA_DIR, "index.json"));
  const replyHours = new Map(
    (published?.rows ?? []).map((row) => [row.id.toLowerCase(), row.replyHours]),
  );
  const replyOf = (repo: UniverseRepo) =>
    replyHours.get(idOf(repo).toLowerCase()) ?? Number.POSITIVE_INFINITY;
  const isOutdated = (repo: UniverseRepo) => outdated.has(idOf(repo).toLowerCase());
  const queue = universe.repos
    .map((repo) => ({ repo, updatedAt: known.get(idOf(repo).toLowerCase()) ?? null }))
    .filter(({ repo, updatedAt }) => {
      const failed = failures[idOf(repo).toLowerCase()];
      if (
        failed &&
        startedAt.getTime() - Date.parse(failed.at) < RETRY_AFTER_HOURS * HOUR_MS
      )
        return false;
      if (updatedAt === null || outdated.has(idOf(repo).toLowerCase())) return true;
      return startedAt.getTime() - Date.parse(updatedAt) > PROGRAM_DUE_HOURS * HOUR_MS;
    })
    .sort((a, b) => {
      if ((a.updatedAt === null) !== (b.updatedAt === null))
        return a.updatedAt === null ? -1 : 1;
      if (a.updatedAt === null) {
        return rankOf(a.repo) - rankOf(b.repo) || latestYear(b.repo) - latestYear(a.repo);
      }
      if (isOutdated(a.repo) !== isOutdated(b.repo)) return isOutdated(a.repo) ? -1 : 1;
      if (isOutdated(a.repo)) {
        const order = replyOf(a.repo) - replyOf(b.repo);
        if (order) return order;
      }
      return Date.parse(a.updatedAt) - Date.parse(b.updatedAt!);
    });
  console.log(`queue: ${queue.length} of ${universe.repos.length} due`);
  console.log(
    `first: ${queue
      .slice(0, 8)
      .map(({ repo }) => idOf(repo))
      .join(", ")}`,
  );

  // A repository never read, or read under older rules, costs a full year of history.
  const isFullRead = (item: { repo: UniverseRepo; updatedAt: string | null }) =>
    item.updatedAt === null || outdated.has(idOf(item.repo).toLowerCase());

  // 3. Refresh until the queue, the budget or the clock runs out.
  let refreshed = 0;
  let failed = 0;
  let stoppedBy: SweepStatus["lastRun"]["stoppedBy"] = "done";
  let next = 0;
  // Several repositories are read at once; each worker takes the next one in the queue.
  const worker = async () => {
    for (;;) {
      if (stoppedBy !== "done" || next >= queue.length) return;
      if (refreshed + failed >= MAX_REPOS) return;
      if (outOfTime()) {
        stoppedBy = "time";
        return;
      }
      // Every worker may be in the middle of a large first read, so the reserve
      // is kept per worker.
      const reserve =
        (isFullRead(queue[next]) ? RESERVE_BACKFILL : RESERVE_REFRESH) * WORKERS;
      if (remaining() < reserve) {
        stoppedBy = "budget";
        return;
      }
      const { repo } = queue[next];
      next += 1;
      const outcome = await refreshOne(repo);
      if (outcome === "limited") {
        stoppedBy = "budget";
        return;
      }
      if (outcome === "ok") refreshed += 1;
      else failed += 1;
    }
  };
  const refreshOne = async (repo: UniverseRepo): Promise<"ok" | "failed" | "limited"> => {
    const id = idOf(repo).toLowerCase();
    try {
      const now = new Date();
      const previous = await readState(id);
      const state = await fetchRepo(
        client,
        repo.owner,
        repo.name,
        { hashKey, now },
        previous,
      );
      await writeAtomic(pathOf("state", id), gzipSync(JSON.stringify(state)));
      await writeAtomic(pathOf("repos", id), JSON.stringify(toDetail(state, repo, now)));
      delete failures[id];
      console.log(
        `ok ${id} ${previous ? "refresh" : "backfill"}, ` +
          `${state.pulls.length} pulls, ${state.issues.length} issues`,
      );
      return "ok";
    } catch (error) {
      if (error instanceof GitHubError && error.kind === "rate-limited") return "limited";
      const reason =
        error instanceof GitHubError
          ? error.kind
          : (error as Error).message.slice(0, 120);
      failures[id] = { reason, at: new Date().toISOString() };
      console.log(`fail ${id} ${reason}`);
      return "failed";
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
  await writeAtomic(join(DATA_DIR, "failures.json"), JSON.stringify(failures));

  // 4. Publish. Only repositories still in the universe are listed.
  const finishedAt = new Date();
  const inUniverse = new Map(universe.repos.map((r) => [idOf(r).toLowerCase(), r]));
  const everything = await listDetails();
  const details = everything.filter((d) => inUniverse.has(idOf(d).toLowerCase()));
  // Opted out or dropped from the universe: remove what was published about it.
  for (const gone of everything.filter((d) => !inUniverse.has(idOf(d).toLowerCase()))) {
    const id = idOf(gone).toLowerCase();
    await rm(pathOf("repos", id), { force: true });
    await rm(pathOf("state", id), { force: true });
  }
  const rows: IndexRow[] = details
    .map((detail) => ({
      ...detail,
      programs: inUniverse.get(idOf(detail).toLowerCase())!.programs,
    }))
    .map(toIndexRow)
    .sort((a, b) => a.id.localeCompare(b.id));
  const issues: AvailableIssue[] = details
    .flatMap(availableIssues)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const ages = details.map((d) => finishedAt.getTime() - Date.parse(d.updatedAt));
  const status: SweepStatus = {
    v: PUBLISHED_VERSION,
    generatedAt: finishedAt.toISOString(),
    universe: universe.repos.length,
    indexed: details.length,
    fresh2d: ages.filter((age) => age <= 2 * DAY_MS).length,
    fresh7d: ages.filter((age) => age <= 7 * DAY_MS).length,
    oldestUpdatedAt:
      details.map((d) => d.updatedAt).sort((a, b) => a.localeCompare(b))[0] ?? null,
    lastRun: {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      refreshed,
      failed,
      pointsSpent: client.budget.spent,
      stoppedBy,
    },
    failures: Object.entries(failures)
      .map(([id, f]) => ({ id, ...f }))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 100),
  };

  const stamp = { v: PUBLISHED_VERSION, generatedAt: finishedAt.toISOString() };
  await writeAtomic(join(DATA_DIR, "index.json"), JSON.stringify({ ...stamp, rows }));
  await writeAtomic(join(DATA_DIR, "issues.json"), JSON.stringify({ ...stamp, issues }));
  await writeAtomic(join(DATA_DIR, "status.json"), JSON.stringify(status, null, 2));
  console.log(
    `done: ${refreshed} refreshed, ${failed} failed, ${client.budget.spent} points, ` +
      `stopped by ${stoppedBy}; ${details.length}/${universe.repos.length} indexed`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
