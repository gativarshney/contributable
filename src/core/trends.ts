import { kaplanMeier, median, type Observation } from "./km";
import { MIN_SAMPLE } from "./metrics";
import type { PullSummary } from "./schema";

const HOUR_MS = 3_600_000;
const WEEK_MS = 7 * 24 * HOUR_MS;

export const SERIES_WEEKS = 52;

export interface WeekPoint {
  /** Start of the week (UTC), ISO date. */
  week: string;
  /** Outside pull requests opened in the week. */
  opened: number;
  /** Of those, how many are merged as of the computation time. */
  merged: number;
  /** Of those, how many had a human reply within 7 days. */
  answered7d: number;
  /** Any pull request or core reply in the week, by anyone. */
  activity: number;
}

/**
 * Weekly points for the last 52 weeks, oldest first. Weeks are counted back from
 * `now`, so the last point is always the most recent seven days.
 */
export function weeklySeries(pulls: readonly PullSummary[], now: Date): WeekPoint[] {
  const end = now.getTime();
  const start = end - SERIES_WEEKS * WEEK_MS;
  const points: WeekPoint[] = Array.from({ length: SERIES_WEEKS }, (_, i) => ({
    week: new Date(start + i * WEEK_MS).toISOString().slice(0, 10),
    opened: 0,
    merged: 0,
    answered7d: 0,
    activity: 0,
  }));
  const indexOf = (iso: string) => {
    const index = Math.floor((Date.parse(iso) - start) / WEEK_MS);
    return index >= 0 && index < SERIES_WEEKS ? index : -1;
  };

  for (const pull of pulls) {
    const index = indexOf(pull.createdAt);
    if (index >= 0) {
      points[index].activity += 1;
      if (pull.cls === "outside") {
        points[index].opened += 1;
        if (pull.mergedAt !== null) points[index].merged += 1;
        if (
          pull.firstResponseAt !== null &&
          Date.parse(pull.firstResponseAt) - Date.parse(pull.createdAt) <= WEEK_MS
        ) {
          points[index].answered7d += 1;
        }
      }
    }
    for (const reply of pull.coreReplyAt) {
      const at = indexOf(reply);
      if (at >= 0) points[at].activity += 1;
    }
  }
  return points;
}

export type TrendFlag =
  "got-faster" | "slowed-down" | "went-quiet" | "steady" | "unknown";

export interface Trend {
  flag: TrendFlag;
  /** Median hours to first reply for outside pull requests opened in each window. */
  recentMedianHours: number | null;
  previousMedianHours: number | null;
  recentN: number;
  previousN: number;
  /** Outside pull requests opened: last 7 days against the 7 days before. */
  openedThisWeek: number;
  openedLastWeek: number;
}

function replyMedian(pulls: readonly PullSummary[], now: number): number | null {
  if (pulls.length < MIN_SAMPLE) return null;
  const observations: Observation[] = pulls.map((p) =>
    p.firstResponseAt !== null
      ? {
          hours: (Date.parse(p.firstResponseAt) - Date.parse(p.createdAt)) / HOUR_MS,
          observed: true,
        }
      : {
          hours:
            ((p.closedAt ? Date.parse(p.closedAt) : now) - Date.parse(p.createdAt)) /
            HOUR_MS,
          observed: false,
        },
  );
  return median(kaplanMeier(observations));
}

/** A change smaller than this, in either direction, is reported as steady. */
export const TREND_RATIO = 1.5;
export const QUIET_WEEKS = 4;

/**
 * Compares the last four weeks with the four before. "Went quiet" means no pull
 * request and no core reply at all in the last four weeks after earlier activity.
 */
export function trend(pulls: readonly PullSummary[], now: Date): Trend {
  const t = now.getTime();
  const outside = pulls.filter((p) => p.cls === "outside");
  const between = (from: number, to: number) =>
    outside.filter((p) => {
      const age = t - Date.parse(p.createdAt);
      return age >= from * WEEK_MS && age < to * WEEK_MS;
    });
  const recent = between(0, 4);
  const previous = between(4, 8);
  const recentMedianHours = replyMedian(recent, t);
  const previousMedianHours = replyMedian(previous, t);

  const series = weeklySeries(pulls, now);
  const lastWeeks = series.slice(-QUIET_WEEKS).reduce((sum, w) => sum + w.activity, 0);
  const before = series.slice(0, -QUIET_WEEKS).reduce((sum, w) => sum + w.activity, 0);

  let flag: TrendFlag = "unknown";
  if (lastWeeks === 0 && before > 0) flag = "went-quiet";
  else if (recentMedianHours !== null && previousMedianHours !== null) {
    const floor = 1; // treat anything under an hour as an hour, so tiny medians do not swing the ratio
    const ratio =
      Math.max(recentMedianHours, floor) / Math.max(previousMedianHours, floor);
    flag =
      ratio >= TREND_RATIO
        ? "slowed-down"
        : ratio <= 1 / TREND_RATIO
          ? "got-faster"
          : "steady";
  } else if (previousMedianHours !== null && recent.length >= MIN_SAMPLE) {
    // Enough recent pull requests, yet fewer than half answered: slower than before.
    flag = "slowed-down";
  }

  return {
    flag,
    recentMedianHours,
    previousMedianHours,
    recentN: recent.length,
    previousN: previous.length,
    openedThisWeek: between(0, 1).length,
    openedLastWeek: between(1, 2).length,
  };
}
