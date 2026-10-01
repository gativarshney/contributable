import type { Collection, Release } from "@/types";
import { daysBetween, inWindow, median, round, wholeDaysSince } from "./time";

export interface ReleaseAnalysis {
  available: boolean;
  /** Releases GitHub returned (the 100 most recent at most). */
  count: number;
  complete: boolean;
  latest: Release | null;
  daysSinceLatest: number | null;
  /** Median days between consecutive releases, across every release returned. */
  medianIntervalDays: number | null;
  shortestIntervalDays: number | null;
  longestIntervalDays: number | null;
  last90: number;
  last365: number;
  prereleases: number;
  /** Releases published in the trailing 365 days, newest first. */
  timeline: Release[];
}

/**
 * Release cadence is described with the median gap between consecutive publish dates.
 * The median is used instead of the mean so one long pause or a burst of patch releases
 * does not dominate the figure.
 */
export function calculateReleaseCadence(
  releases: Collection<Release>,
  now: Date,
): ReleaseAnalysis {
  const items = [...releases.items].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  const intervals: number[] = [];
  for (let i = 0; i < items.length - 1; i++) {
    intervals.push(daysBetween(items[i + 1].publishedAt, items[i].publishedAt));
  }
  const med = median(intervals);
  const latest = items[0] ?? null;

  return {
    available: releases.status === "ok",
    count: items.length,
    complete: releases.complete,
    latest,
    daysSinceLatest: latest ? wholeDaysSince(latest.publishedAt, now) : null,
    medianIntervalDays: med === null ? null : round(med),
    shortestIntervalDays: intervals.length ? round(Math.min(...intervals)) : null,
    longestIntervalDays: intervals.length ? round(Math.max(...intervals)) : null,
    last90: items.filter((r) => inWindow(r.publishedAt, now, 90)).length,
    last365: items.filter((r) => inWindow(r.publishedAt, now, 365)).length,
    prereleases: items.filter((r) => r.prerelease).length,
    timeline: items.filter((r) => inWindow(r.publishedAt, now, 365)),
  };
}
