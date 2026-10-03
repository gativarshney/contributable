import type { RepoMetrics } from "./metrics";
import type { RepoFacts } from "./schema";
import type { Trend, TrendFlag, WeekPoint } from "./trends";

/** Bumped when a published file changes shape. Readers ignore versions they do not know. */
export const PUBLISHED_VERSION = 1;

export interface ProgramEntry {
  program: "gsoc";
  /** Organisation slug on the programme's site. */
  slug: string;
  name: string;
  years: number[];
}

/** One repository to index, and why it is in the index. */
export interface UniverseRepo {
  owner: string;
  name: string;
  programs: ProgramEntry[];
}

/** Everything the repo page shows. One file per repository. */
export interface RepoDetail {
  v: number;
  owner: string;
  name: string;
  /** When the data was read from GitHub. */
  updatedAt: string;
  /** Earliest creation date the pull request history is complete from. */
  coveredSince: string;
  facts: RepoFacts;
  metrics: RepoMetrics;
  series: WeekPoint[];
  trend: Trend;
  programs: ProgramEntry[];
}

/**
 * One row of the index: what Explore, the home field and the rankings need. Keys are
 * short because twenty thousand of these travel together.
 */
export interface IndexRow {
  /** owner/name */
  id: string;
  /** Description, cut to a line. */
  d: string;
  stars: number;
  /** Languages by share of code, largest first, at most three. */
  lang: string[];
  fw: string[];
  topics: string[];
  /** GSoC organisation slug and years, when the repo belongs to one. */
  gsoc: string | null;
  years: number[];
  updatedAt: string;
  /** Outside pull requests: share merged of those decided, and how many were decided. */
  mergeRate: number | null;
  decided: number;
  firstTimerRate: number | null;
  /** First human reply to outside pull requests. */
  replyHours: number | null;
  within48h: number | null;
  within7d: number | null;
  replyN: number;
  mergeHours: number | null;
  issueReplyHours: number | null;
  /** Beginner issues nobody has claimed and that are not stale. */
  available: number;
  helpWanted: number;
  commits90d: number | null;
  maintainers: number;
  pushedAt: string | null;
  cla: RepoFacts["gettingStarted"]["cla"];
  channels: string[];
  guide: boolean;
  trend: TrendFlag;
  /** Outside pull requests opened per four weeks over the last year, oldest first. */
  spark: number[];
  /** Core replies by hour of day in UTC, scaled 0 to 9; null when withheld. */
  hours: number[] | null;
}

export interface AvailableIssue {
  id: string;
  n: number;
  title: string;
  label: "beginner" | "help-wanted";
  createdAt: string;
  updatedAt: string;
}

export interface SweepStatus {
  v: number;
  generatedAt: string;
  universe: number;
  indexed: number;
  /** Repositories refreshed within two days. */
  fresh2d: number;
  fresh7d: number;
  oldestUpdatedAt: string | null;
  lastRun: {
    startedAt: string;
    finishedAt: string;
    refreshed: number;
    failed: number;
    pointsSpent: number;
    stoppedBy: "done" | "budget" | "time";
  };
  /** Repositories that could not be read on the last attempt, with the reason. */
  failures: { id: string; reason: string; at: string }[];
}

const MAX_CURVE_POINTS = 48;

/** Thins a survival curve so a detail file stays small; the first and last steps stay. */
export function thinCurve<T>(curve: T[]): T[] {
  if (curve.length <= MAX_CURVE_POINTS) return curve;
  const step = (curve.length - 1) / (MAX_CURVE_POINTS - 1);
  return Array.from({ length: MAX_CURVE_POINTS }, (_, i) => curve[Math.round(i * step)]);
}

function hourOfDayProfile(hours: number[] | null): number[] | null {
  if (hours === null) return null;
  const day = new Array<number>(24).fill(0);
  hours.forEach((count, slot) => (day[slot % 24] += count));
  const peak = Math.max(...day);
  if (peak === 0) return null;
  return day.map((count) => Math.round((count / peak) * 9));
}

function spark(series: WeekPoint[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < series.length; i += 4) {
    out.push(series.slice(i, i + 4).reduce((sum, w) => sum + w.opened, 0));
  }
  return out;
}

const round = (value: number | null, digits: number) =>
  value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits;

export function toIndexRow(detail: RepoDetail): IndexRow {
  const { facts, metrics } = detail;
  const cohort = metrics.outsidePulls.cohort;
  const totalBytes = Object.values(facts.languages).reduce((a, b) => a + b, 0);
  const lang = Object.entries(facts.languages)
    .sort((a, b) => b[1] - a[1])
    .filter(([, bytes]) => totalBytes > 0 && bytes / totalBytes >= 0.05)
    .slice(0, 3)
    .map(([name]) => name);
  const gsoc = detail.programs.find((p) => p.program === "gsoc") ?? null;
  return {
    id: `${detail.owner}/${detail.name}`,
    d: (facts.description ?? "").slice(0, 140),
    stars: facts.stars,
    lang,
    fw: facts.frameworks.slice(0, 6),
    topics: facts.topics.slice(0, 6),
    gsoc: gsoc?.slug ?? null,
    years: gsoc?.years ?? [],
    updatedAt: detail.updatedAt,
    mergeRate: round(cohort.mergeRate, 3),
    decided: cohort.merged + cohort.closedUnmerged,
    firstTimerRate: round(metrics.outsidePulls.firstTimers.mergeRate, 3),
    replyHours: round(metrics.pullFirstResponse.medianHours, 1),
    within48h: round(metrics.pullFirstResponse.within48h, 3),
    within7d: round(metrics.pullFirstResponse.within7d, 3),
    replyN: metrics.pullFirstResponse.n,
    mergeHours: round(metrics.timeToMerge.medianHours, 1),
    issueReplyHours: round(metrics.issueFirstResponse.medianHours, 1),
    available: metrics.starter.counts.available,
    helpWanted: metrics.starter.helpWantedAvailable,
    commits90d: facts.commits90d,
    maintainers: metrics.activeMaintainers,
    pushedAt: facts.pushedAt,
    cla: facts.gettingStarted.cla,
    channels: [...new Set(facts.gettingStarted.channels.map((c) => c.kind))],
    guide: facts.gettingStarted.contributing,
    trend: detail.trend.flag,
    spark: spark(detail.series),
    hours: hourOfDayProfile(metrics.responseWindow.hours),
  };
}

export function availableIssues(detail: RepoDetail): AvailableIssue[] {
  return detail.metrics.starter.issues
    .filter((issue) => issue.state === "available")
    .map((issue) => ({
      id: `${detail.owner}/${detail.name}`,
      n: issue.n,
      title: issue.title.slice(0, 160),
      label: issue.label,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    }));
}
