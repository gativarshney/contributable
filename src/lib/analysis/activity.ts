import { WINDOWS, type Collection, type Commit, type WindowDays } from "@/types";
import { DAY_MS, inWindow, isCovered, round, utcDay } from "./time";

export interface ActivityWindow {
  /** False when the collection limit was hit before reaching the start of this window. */
  covered: boolean;
  commits: number;
  activeDays: number;
  commitsPerWeek: number;
  /** Commits in the equally long period immediately before this window, when covered. */
  previousCommits: number | null;
  /** Percentage change against the previous period; null when it had no commits. */
  changePct: number | null;
}

export interface ActivityAnalysis {
  available: boolean;
  empty: boolean;
  complete: boolean;
  coveredSince: string | null;
  sampleSize: number;
  lastCommitAt: string | null;
  windows: Record<WindowDays, ActivityWindow>;
  /** One entry per UTC day for the trailing 90 days, oldest first. */
  daily: { date: string; count: number }[];
  /** Longest run of consecutive days without a commit in the trailing 90 days. */
  longestQuietDays: number | null;
}

export function calculateActivity(
  commits: Collection<Commit>,
  now: Date,
): ActivityAnalysis {
  const items = commits.items;
  const ok = commits.status === "ok";
  const windows = {} as Record<WindowDays, ActivityWindow>;

  for (const days of WINDOWS) {
    const current = items.filter((c) => inWindow(c.date, now, days));
    const previousCovered =
      ok && days < 90 && isCovered(commits.coveredSince, now, days * 2);
    const previousCommits = previousCovered
      ? items.filter((c) => inWindow(c.date, now, days * 2)).length - current.length
      : null;
    windows[days] = {
      covered: ok && isCovered(commits.coveredSince, now, days),
      commits: current.length,
      activeDays: new Set(current.map((c) => utcDay(c.date))).size,
      commitsPerWeek: round(current.length / (days / 7)),
      previousCommits,
      changePct: previousCommits
        ? round(((current.length - previousCommits) / previousCommits) * 100, 0)
        : null,
    };
  }

  const perDay = new Map<string, number>();
  for (const commit of items) {
    const day = utcDay(commit.date);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const daily = Array.from({ length: 90 }, (_, i) => {
    const date = utcDay(new Date(now.getTime() - (89 - i) * DAY_MS));
    return { date, count: perDay.get(date) ?? 0 };
  });

  let longestQuietDays: number | null = null;
  if (windows[90].covered) {
    let run = 0;
    longestQuietDays = 0;
    for (const day of daily) {
      run = day.count === 0 ? run + 1 : 0;
      longestQuietDays = Math.max(longestQuietDays, run);
    }
  }

  return {
    available: ok,
    empty: ok && items.length === 0,
    complete: commits.complete,
    coveredSince: commits.coveredSince,
    sampleSize: items.length,
    lastCommitAt: items.reduce<string | null>(
      (latest, c) => (latest === null || c.date > latest ? c.date : latest),
      null,
    ),
    windows,
    daily,
    longestQuietDays,
  };
}
