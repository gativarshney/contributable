import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MIN_SAMPLE, computeMetrics, firstTimerNumbers, hourOfWeek } from "./metrics";
import type { IssueSummary, PullSummary } from "./schema";

const NOW = new Date("2026-10-01T00:00:00Z");
const ago = (days: number, hours = 0) =>
  new Date(NOW.getTime() - days * 86_400_000 + hours * 3_600_000).toISOString();

let counter = 0;
function pull(over: Partial<PullSummary> & { daysAgo: number }): PullSummary {
  counter += 1;
  const { daysAgo, ...rest } = over;
  return {
    n: counter,
    createdAt: ago(daysAgo),
    closedAt: null,
    mergedAt: null,
    updatedAt: ago(daysAgo),
    cls: "outside",
    author: `a${counter}`,
    firstResponseAt: null,
    coreReplyAt: [],
    coreActors: [],
    ...rest,
  };
}

function issue(over: Partial<IssueSummary> & { daysAgo: number }): IssueSummary {
  counter += 1;
  const { daysAgo, ...rest } = over;
  return {
    n: counter,
    title: `Issue ${counter}`,
    createdAt: ago(daysAgo),
    closedAt: null,
    updatedAt: ago(Math.min(daysAgo, 5)),
    cls: "outside",
    author: `a${counter}`,
    firstResponseAt: null,
    labels: [],
    assignees: 0,
    linkedOpenPulls: 0,
    lastClaimAt: null,
    coreReplyAt: [],
    coreActors: [],
    ...rest,
  };
}

describe("computeMetrics", () => {
  it("measures the outside merge rate on the 30 to 120 day cohort only", () => {
    const pulls = [
      // In the cohort: 6 merged, 2 closed without merge, 2 still open.
      ...Array.from({ length: 6 }, () =>
        pull({ daysAgo: 60, mergedAt: ago(58), closedAt: ago(58) }),
      ),
      ...Array.from({ length: 2 }, () => pull({ daysAgo: 70, closedAt: ago(50) })),
      ...Array.from({ length: 2 }, () => pull({ daysAgo: 45 })),
      // Outside the cohort or not outside authors: ignored.
      pull({ daysAgo: 10, mergedAt: ago(9), closedAt: ago(9) }),
      pull({ daysAgo: 200, closedAt: ago(190) }),
      pull({ daysAgo: 60, cls: "core", mergedAt: ago(59), closedAt: ago(59) }),
      pull({ daysAgo: 60, cls: "bot", mergedAt: ago(59), closedAt: ago(59) }),
    ];
    const { cohort, year } = computeMetrics(pulls, [], NOW).outsidePulls;
    expect(cohort.n).toBe(10);
    expect(cohort.merged).toBe(6);
    expect(cohort.closedUnmerged).toBe(2);
    expect(cohort.open).toBe(2);
    expect(cohort.mergeRate).toBeCloseTo(0.75, 10);
    expect(cohort.openShare).toBeCloseTo(0.2, 10);
    expect(year.n).toBe(11);
    expect(cohort.evidence.merged).toHaveLength(6);
  });

  it("withholds numbers under the minimum sample", () => {
    const pulls = Array.from({ length: MIN_SAMPLE - 1 }, () =>
      pull({
        daysAgo: 60,
        mergedAt: ago(59),
        closedAt: ago(59),
        firstResponseAt: ago(60, 2),
      }),
    );
    const metrics = computeMetrics(pulls, [], NOW);
    expect(metrics.outsidePulls.cohort.mergeRate).toBeNull();
    expect(metrics.pullFirstResponse.medianHours).toBeNull();
    expect(metrics.pullFirstResponse.n).toBe(MIN_SAMPLE - 1);
    expect(metrics.timeToMerge.medianHours).toBeNull();
  });

  it("keeps unanswered pull requests in the reply estimate", () => {
    const answered = Array.from({ length: 4 }, () =>
      pull({ daysAgo: 60, firstResponseAt: ago(60, 10) }),
    );
    const waiting = Array.from({ length: 6 }, () => pull({ daysAgo: 60 }));
    const timing = computeMetrics([...answered, ...waiting], [], NOW).pullFirstResponse;
    expect(timing.n).toBe(10);
    expect(timing.answered).toBe(4);
    expect(timing.waiting).toBe(6);
    // Only 40% were ever answered, so there is no median to report.
    expect(timing.medianHours).toBeNull();
    expect(timing.within48h).toBeCloseTo(0.4, 10);
  });

  it("counts a pull request closed before anyone replied as never answered", () => {
    const answered = Array.from({ length: 19 }, () =>
      pull({ daysAgo: 60, firstResponseAt: ago(60, 10) }),
    );
    // Closed an hour after opening, with no reply from anyone.
    const closed = pull({ daysAgo: 60, closedAt: ago(60, 1) });
    const timing = computeMetrics([...answered, closed], [], NOW).pullFirstResponse;
    expect(timing.waiting).toBe(1);
    expect(timing.within48h).toBeCloseTo(0.95, 10);
    expect(timing.within7d).toBeCloseTo(0.95, 10);
  });

  it("reports median and p75 reply times", () => {
    const hours = [1, 2, 3, 4, 5, 6, 7, 8];
    const pulls = hours.map((h) => pull({ daysAgo: 60, firstResponseAt: ago(60, h) }));
    const timing = computeMetrics(pulls, [], NOW).pullFirstResponse;
    expect(timing.medianHours).toBeCloseTo(4, 6);
    expect(timing.p75Hours).toBeCloseTo(6, 6);
    expect(timing.within48h).toBe(1);
  });

  it("separates first-time authors using the stored history", () => {
    const returning = pull({
      daysAgo: 300,
      author: "x",
      mergedAt: ago(299),
      closedAt: ago(299),
    });
    const again = pull({
      daysAgo: 60,
      author: "x",
      mergedAt: ago(59),
      closedAt: ago(59),
    });
    const fresh = pull({ daysAgo: 60, author: "y" });
    const first = firstTimerNumbers([again, fresh, returning]);
    expect(first.has(returning.n)).toBe(true);
    expect(first.has(again.n)).toBe(false);
    expect(first.has(fresh.n)).toBe(true);
  });

  it("counts starter issues by state and keeps help wanted separate", () => {
    const issues = [
      issue({ daysAgo: 10, labels: ["good first issue"] }),
      issue({ daysAgo: 10, labels: ["good-first-issue"], assignees: 1 }),
      issue({ daysAgo: 10, labels: ["beginner"], linkedOpenPulls: 1 }),
      issue({ daysAgo: 200, labels: ["easy"], updatedAt: ago(100) }),
      issue({ daysAgo: 10, labels: ["help wanted"] }),
      issue({ daysAgo: 10, labels: ["good first issue"], closedAt: ago(2) }),
      issue({ daysAgo: 10, labels: ["bug"] }),
    ];
    const {
      counts,
      helpWantedAvailable,
      issues: listed,
    } = computeMetrics([], issues, NOW).starter;
    expect(counts).toEqual({ available: 1, claimed: 1, "in-progress": 1, stale: 1 });
    expect(helpWantedAvailable).toBe(1);
    expect(listed).toHaveLength(5);
  });

  it("withholds the response window when fewer than three core members replied", () => {
    const two = [
      pull({ daysAgo: 5, coreReplyAt: [ago(4)], coreActors: ["m1"], updatedAt: ago(4) }),
      pull({ daysAgo: 6, coreReplyAt: [ago(5)], coreActors: ["m2"], updatedAt: ago(5) }),
    ];
    const hidden = computeMetrics(two, [], NOW).responseWindow;
    expect(hidden.hours).toBeNull();
    expect(hidden.people).toBe(2);

    const three = [
      ...two,
      pull({ daysAgo: 7, coreReplyAt: [ago(6)], coreActors: ["m3"], updatedAt: ago(6) }),
    ];
    const shown = computeMetrics(three, [], NOW);
    expect(shown.responseWindow.hours).toHaveLength(168);
    expect(shown.responseWindow.hours?.reduce((a, b) => a + b, 0)).toBe(3);
    expect(shown.activeMaintainers).toBe(3);
  });

  it("places Monday midnight UTC at hour zero", () => {
    expect(hourOfWeek("2026-09-28T00:30:00Z")).toBe(0);
    expect(hourOfWeek("2026-10-04T23:10:00Z")).toBe(167);
  });

  it("is deterministic and keeps every rate within [0, 1]", () => {
    const arbitraryPull = fc
      .record({
        daysAgo: fc.integer({ min: 0, max: 400 }),
        outcome: fc.constantFrom("open", "merged", "closed"),
        cls: fc.constantFrom("core", "outside", "bot"),
        replyAfterHours: fc.option(fc.integer({ min: 0, max: 600 }), { nil: null }),
        author: fc.constantFrom("a", "b", "c", "d", "e"),
      })
      .map((p) =>
        pull({
          daysAgo: p.daysAgo,
          cls: p.cls,
          author: p.author,
          mergedAt: p.outcome === "merged" ? ago(p.daysAgo, 1) : null,
          closedAt: p.outcome === "open" ? null : ago(p.daysAgo, 1),
          firstResponseAt:
            p.replyAfterHours === null ? null : ago(p.daysAgo, p.replyAfterHours),
        }),
      );
    fc.assert(
      fc.property(fc.array(arbitraryPull, { maxLength: 80 }), (pulls) => {
        const a = computeMetrics(pulls, [], NOW);
        const b = computeMetrics([...pulls].reverse(), [], NOW);
        expect(b.outsidePulls.cohort.mergeRate).toBe(a.outsidePulls.cohort.mergeRate);
        expect(b.pullFirstResponse.medianHours).toBe(a.pullFirstResponse.medianHours);
        for (const value of [
          a.outsidePulls.cohort.mergeRate,
          a.outsidePulls.cohort.openShare,
          a.pullFirstResponse.within48h,
          a.pullFirstResponse.within7d,
        ]) {
          if (value !== null) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
          }
        }
        const c = a.outsidePulls.cohort;
        expect(c.merged + c.closedUnmerged + c.open).toBe(c.n);
      }),
    );
  });
});
