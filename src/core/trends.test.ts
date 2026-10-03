import { describe, expect, it } from "vitest";
import type { PullSummary } from "./schema";
import { SERIES_WEEKS, trend, weeklySeries } from "./trends";

const NOW = new Date("2026-10-01T00:00:00Z");
const ago = (days: number, hours = 0) =>
  new Date(NOW.getTime() - days * 86_400_000 + hours * 3_600_000).toISOString();

let counter = 0;
function pull(
  daysAgo: number,
  replyAfterHours: number | null,
  over: Partial<PullSummary> = {},
): PullSummary {
  counter += 1;
  return {
    n: counter,
    createdAt: ago(daysAgo),
    closedAt: null,
    mergedAt: null,
    updatedAt: ago(daysAgo),
    cls: "outside",
    author: `a${counter}`,
    firstResponseAt: replyAfterHours === null ? null : ago(daysAgo, replyAfterHours),
    coreReplyAt: replyAfterHours === null ? [] : [ago(daysAgo, replyAfterHours)],
    coreActors: [],
    ...over,
  };
}

const many = (count: number, daysAgo: number, reply: number | null) =>
  Array.from({ length: count }, () => pull(daysAgo, reply));

describe("weeklySeries", () => {
  it("returns 52 points, oldest first, with the newest week last", () => {
    const series = weeklySeries(
      [pull(1, 2, { mergedAt: ago(0.5) }), pull(360, null)],
      NOW,
    );
    expect(series).toHaveLength(SERIES_WEEKS);
    expect(series[SERIES_WEEKS - 1]).toMatchObject({
      opened: 1,
      merged: 1,
      answered7d: 1,
    });
    expect(series[0].opened).toBe(1);
    expect(series[0].week < series[1].week).toBe(true);
  });

  it("ignores pull requests older than the window and counts only outside authors as opened", () => {
    const series = weeklySeries([pull(400, 1), pull(3, 1, { cls: "core" })], NOW);
    expect(series.reduce((sum, w) => sum + w.opened, 0)).toBe(0);
    expect(series[SERIES_WEEKS - 1].activity).toBe(2);
  });
});

describe("trend", () => {
  it("flags a repository that got faster", () => {
    const result = trend([...many(6, 10, 4), ...many(6, 40, 48)], NOW);
    expect(result.flag).toBe("got-faster");
    expect(result.recentMedianHours).toBeCloseTo(4, 6);
    expect(result.previousMedianHours).toBeCloseTo(48, 6);
  });

  it("flags a repository that slowed down", () => {
    expect(trend([...many(6, 10, 90), ...many(6, 40, 10)], NOW).flag).toBe("slowed-down");
  });

  it("flags slower when recent pull requests are mostly unanswered", () => {
    expect(trend([...many(6, 10, null), ...many(6, 40, 10)], NOW).flag).toBe(
      "slowed-down",
    );
  });

  it("reports steady for small changes", () => {
    expect(trend([...many(6, 10, 10), ...many(6, 40, 12)], NOW).flag).toBe("steady");
  });

  it("flags a repository that went quiet", () => {
    expect(trend(many(8, 60, 5), NOW).flag).toBe("went-quiet");
  });

  it("says unknown when there is too little to compare", () => {
    expect(trend([...many(2, 10, 5), ...many(2, 40, 5)], NOW).flag).toBe("unknown");
    expect(trend([], NOW).flag).toBe("unknown");
  });

  it("counts week over week openings", () => {
    const result = trend([...many(3, 2, 1), ...many(5, 9, 1)], NOW);
    expect(result.openedThisWeek).toBe(3);
    expect(result.openedLastWeek).toBe(5);
  });
});
