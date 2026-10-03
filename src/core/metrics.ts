import { kaplanMeier, median, quantile, shareWithin, type Observation } from "./km";
import type { IssueSummary, PullSummary } from "./schema";
import { starterClassOf, starterState, type StarterLabelClass, type StarterState } from "./starter";

/** Below this many items a number is withheld and shown as "Not enough data". */
export const MIN_SAMPLE = 5;
/** How many pull request or issue numbers are kept as proof for each metric. */
export const EVIDENCE_LIMIT = 20;
/** Fewer distinct core repliers than this and the response window is withheld. */
export const MIN_WINDOW_PEOPLE = 3;

export const COHORT_MIN_DAYS = 30;
export const COHORT_MAX_DAYS = 120;
export const YEAR_DAYS = 365;
export const ACTIVE_DAYS = 90;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const hoursBetween = (from: string, to: number) => (to - Date.parse(from)) / HOUR_MS;
const rate = (part: number, whole: number) => (whole >= MIN_SAMPLE ? part / whole : null);

export interface MergeOutcome {
  n: number;
  merged: number;
  closedUnmerged: number;
  open: number;
  /** merged / (merged + closed without merge); null under the minimum sample. */
  mergeRate: number | null;
  /** Share of the cohort still open; null under the minimum sample. */
  openShare: number | null;
  evidence: { merged: number[]; closedUnmerged: number[]; open: number[] };
}

export interface ResponseTiming {
  n: number;
  answered: number;
  waiting: number;
  medianHours: number | null;
  p75Hours: number | null;
  within48h: number | null;
  within7d: number | null;
  /** Survival curve steps, for the "time to first reply" chart. */
  curve: { hours: number; waiting: number }[];
  evidence: { answered: number[]; waiting: number[] };
}

export interface StarterIssue {
  n: number;
  title: string;
  state: StarterState;
  label: StarterLabelClass;
  createdAt: string;
  updatedAt: string;
}

export interface RepoMetrics {
  computedAt: string;
  outsidePulls: {
    cohort: MergeOutcome;
    firstTimers: MergeOutcome;
    year: MergeOutcome;
  };
  pullFirstResponse: ResponseTiming;
  timeToMerge: { n: number; merged: number; medianHours: number | null; evidence: number[] };
  issueFirstResponse: ResponseTiming;
  starter: {
    counts: Record<StarterState, number>;
    helpWantedAvailable: number;
    issues: StarterIssue[];
  };
  responseWindow: {
    /** 168 reply counts, hour of week in UTC starting Monday 00:00; null when withheld. */
    hours: number[] | null;
    people: number;
    replies: number;
  };
  activeMaintainers: number;
}

function inAgeRange(createdAt: string, now: number, minDays: number, maxDays: number): boolean {
  const age = now - Date.parse(createdAt);
  return age >= minDays * DAY_MS && age < maxDays * DAY_MS;
}

function mergeOutcome(pulls: readonly PullSummary[]): MergeOutcome {
  const merged = pulls.filter((p) => p.mergedAt !== null);
  const closedUnmerged = pulls.filter((p) => p.mergedAt === null && p.closedAt !== null);
  const open = pulls.filter((p) => p.closedAt === null);
  const decided = merged.length + closedUnmerged.length;
  const proof = (items: PullSummary[]) => items.slice(0, EVIDENCE_LIMIT).map((p) => p.n);
  return {
    n: pulls.length,
    merged: merged.length,
    closedUnmerged: closedUnmerged.length,
    open: open.length,
    mergeRate: rate(merged.length, decided),
    openShare: rate(open.length, pulls.length),
    evidence: { merged: proof(merged), closedUnmerged: proof(closedUnmerged), open: proof(open) },
  };
}

interface Awaiting {
  n: number;
  createdAt: string;
  closedAt: string | null;
  firstResponseAt: string | null;
}

/**
 * Time to first human response. An item nobody has answered stays in the estimate as
 * "still waiting" up to now, or up to the moment it was closed unanswered.
 */
function responseTiming(items: readonly Awaiting[], now: number): ResponseTiming {
  const observations: Observation[] = items.map((item) => {
    if (item.firstResponseAt !== null) {
      return {
        hours: Math.max(0, hoursBetween(item.createdAt, Date.parse(item.firstResponseAt))),
        observed: true,
      };
    }
    const until = item.closedAt !== null ? Date.parse(item.closedAt) : now;
    return { hours: Math.max(0, hoursBetween(item.createdAt, until)), observed: false };
  });
  const curve = kaplanMeier(observations);
  const enough = items.length >= MIN_SAMPLE;
  const answered = items.filter((i) => i.firstResponseAt !== null);
  const waiting = items.filter((i) => i.firstResponseAt === null);
  return {
    n: items.length,
    answered: answered.length,
    waiting: waiting.length,
    medianHours: enough ? median(curve) : null,
    p75Hours: enough ? quantile(curve, 0.75) : null,
    within48h: enough ? shareWithin(curve, 48) : null,
    within7d: enough ? shareWithin(curve, 168) : null,
    curve: enough ? curve.steps.map((s) => ({ hours: s.hours, waiting: s.survival })) : [],
    evidence: {
      answered: answered.slice(0, EVIDENCE_LIMIT).map((i) => i.n),
      waiting: waiting.slice(0, EVIDENCE_LIMIT).map((i) => i.n),
    },
  };
}

/**
 * Time from opening to merge. A pull request closed without merging will never merge,
 * so it stays in the risk set until now instead of leaving at its close time.
 */
function timeToMerge(pulls: readonly PullSummary[], now: number) {
  const observations: Observation[] = pulls.map((p) =>
    p.mergedAt !== null
      ? { hours: Math.max(0, hoursBetween(p.createdAt, Date.parse(p.mergedAt))), observed: true }
      : { hours: Math.max(0, hoursBetween(p.createdAt, now)), observed: false },
  );
  const merged = pulls.filter((p) => p.mergedAt !== null);
  return {
    n: pulls.length,
    merged: merged.length,
    medianHours: pulls.length >= MIN_SAMPLE ? median(kaplanMeier(observations)) : null,
    evidence: merged.slice(0, EVIDENCE_LIMIT).map((p) => p.n),
  };
}

/** Hour of week in UTC, Monday 00:00 = 0. */
export function hourOfWeek(iso: string): number {
  const date = new Date(iso);
  return ((date.getUTCDay() + 6) % 7) * 24 + date.getUTCHours();
}

/**
 * Marks which outside pull requests are an author's first in the stored history.
 * GitHub's own FIRST_TIME_CONTRIBUTOR flag is not used: it changes once a pull request
 * merges, so it cannot be read back later.
 */
export function firstTimerNumbers(pulls: readonly PullSummary[]): Set<number> {
  const seen = new Set<string>();
  const first = new Set<number>();
  const ordered = [...pulls].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  for (const pull of ordered) {
    if (pull.author === null) continue;
    if (!seen.has(pull.author) && pull.cls === "outside") first.add(pull.n);
    seen.add(pull.author);
  }
  return first;
}

export function computeMetrics(
  pulls: readonly PullSummary[],
  issues: readonly IssueSummary[],
  now: Date,
): RepoMetrics {
  const t = now.getTime();
  const newestFirst = <T extends { createdAt: string }>(items: readonly T[]) =>
    [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const outside = newestFirst(pulls.filter((p) => p.cls === "outside"));
  const cohort = outside.filter((p) => inAgeRange(p.createdAt, t, COHORT_MIN_DAYS, COHORT_MAX_DAYS));
  const year = outside.filter((p) => inAgeRange(p.createdAt, t, COHORT_MIN_DAYS, YEAR_DAYS));
  const firstTimers = firstTimerNumbers(pulls);

  const cohortIssues = newestFirst(
    issues.filter(
      (i) => i.cls !== "bot" && inAgeRange(i.createdAt, t, COHORT_MIN_DAYS, COHORT_MAX_DAYS),
    ),
  );

  const starterIssues: StarterIssue[] = [];
  const counts: Record<StarterState, number> = {
    available: 0,
    claimed: 0,
    "in-progress": 0,
    stale: 0,
  };
  let helpWantedAvailable = 0;
  for (const issue of newestFirst(issues)) {
    if (issue.closedAt !== null) continue;
    const label = starterClassOf(issue.labels);
    if (label === null) continue;
    const state = starterState(issue, now);
    if (label === "beginner") counts[state] += 1;
    else if (state === "available") helpWantedAvailable += 1;
    starterIssues.push({
      n: issue.n,
      title: issue.title,
      state,
      label,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    });
  }

  const windowStart = t - ACTIVE_DAYS * DAY_MS;
  const hours = new Array<number>(168).fill(0);
  const repliers = new Set<string>();
  const active = new Set<string>();
  let replies = 0;
  for (const item of [...pulls, ...issues]) {
    const recent = item.coreReplyAt.filter((at) => Date.parse(at) >= windowStart);
    for (const at of recent) {
      hours[hourOfWeek(at)] += 1;
      replies += 1;
    }
    if (Date.parse(item.updatedAt) >= windowStart) {
      for (const actor of item.coreActors) {
        active.add(actor);
        if (recent.length > 0) repliers.add(actor);
      }
    }
  }

  return {
    computedAt: now.toISOString(),
    outsidePulls: {
      cohort: mergeOutcome(cohort),
      firstTimers: mergeOutcome(cohort.filter((p) => firstTimers.has(p.n))),
      year: mergeOutcome(year),
    },
    pullFirstResponse: responseTiming(cohort, t),
    timeToMerge: timeToMerge(cohort, t),
    issueFirstResponse: responseTiming(cohortIssues, t),
    starter: { counts, helpWantedAvailable, issues: starterIssues },
    responseWindow: {
      hours: repliers.size >= MIN_WINDOW_PEOPLE ? hours : null,
      people: repliers.size,
      replies,
    },
    activeMaintainers: active.size,
  };
}
