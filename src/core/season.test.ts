import { describe, expect, it } from "vitest";
import type { PullSummary } from "./schema";
import { computeSeason, rememberSeason, seasonCovered, seasonPulls } from "./season";

const NOW = new Date("2026-10-15T00:00:00Z");
let counter = 0;

function pull(over: Partial<PullSummary> & { createdAt: string }): PullSummary {
  counter += 1;
  return {
    n: counter,
    closedAt: null,
    mergedAt: null,
    updatedAt: over.createdAt,
    cls: "outside",
    author: `a${counter}`,
    firstResponseAt: null,
    coreReplyAt: [],
    coreActors: [],
    ...over,
  };
}

const hoursAfter = (iso: string, hours: number) =>
  new Date(Date.parse(iso) + hours * 3_600_000).toISOString();

describe("seasonCovered", () => {
  it("is true when the first read walked past the start of the window", () => {
    const state = {
      coveredSince: "2025-10-04T00:00:00.000Z",
      pulls: [
        pull({ createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z" }),
        pull({ createdAt: "2025-11-01T00:00:00Z", updatedAt: "2025-11-02T00:00:00Z" }),
      ],
    };
    expect(seasonCovered(state)).toBe(true);
  });

  it("is false when a busy repository's read stopped after the window", () => {
    // Like rust-lang/rust: thousands of pull requests, the walk reached late August.
    const state = {
      coveredSince: "2025-10-05T00:00:00.000Z",
      pulls: Array.from({ length: 2400 }, () =>
        pull({ createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-08-28T00:00:00Z" }),
      ),
    };
    expect(seasonCovered(state)).toBe(false);
  });

  it("is false when the history itself starts after the window", () => {
    expect(seasonCovered({ coveredSince: "2026-06-01T00:00:00.000Z", pulls: [] })).toBe(
      false,
    );
  });

  it("is true for a small history, which cannot have been cut short", () => {
    const state = {
      coveredSince: "2025-10-04T00:00:00.000Z",
      pulls: Array.from({ length: 40 }, () =>
        pull({ createdAt: "2026-03-01T00:00:00Z" }),
      ),
    };
    expect(seasonCovered(state)).toBe(true);
  });

  it("is true for a quiet repository with no pull requests at all", () => {
    expect(seasonCovered({ coveredSince: "2025-10-04T00:00:00.000Z", pulls: [] })).toBe(
      true,
    );
  });
});

describe("seasonPulls", () => {
  it("keeps outside pull requests opened inside the window only", () => {
    const inside = pull({ createdAt: "2026-02-01T00:00:00Z" });
    const lastDay = pull({ createdAt: "2026-04-30T23:59:59Z" });
    const after = pull({ createdAt: "2026-05-01T00:00:00Z" });
    const before = pull({ createdAt: "2026-01-31T23:59:59Z" });
    const core = pull({ createdAt: "2026-03-01T00:00:00Z", cls: "core" });
    const bot = pull({ createdAt: "2026-03-01T00:00:00Z", cls: "bot" });
    expect(
      seasonPulls([inside, lastDay, after, before, core, bot]).map((p) => p.n),
    ).toEqual([inside.n, lastDay.n]);
  });
});

describe("computeSeason", () => {
  it("measures the window by the same rules as the rolling figures", () => {
    const opened = "2026-03-10T00:00:00Z";
    const pulls = [
      ...Array.from({ length: 8 }, () =>
        pull({
          createdAt: opened,
          firstResponseAt: hoursAfter(opened, 6),
          mergedAt: hoursAfter(opened, 48),
          closedAt: hoursAfter(opened, 48),
        }),
      ),
      pull({ createdAt: opened, firstResponseAt: hoursAfter(opened, 240) }),
      // Closed without a word: counts as never answered and as not merged.
      pull({ createdAt: opened, closedAt: hoursAfter(opened, 1) }),
    ];
    const figures = computeSeason(
      { coveredSince: "2025-10-04T00:00:00.000Z", pulls },
      NOW,
    );
    expect(figures).toEqual({
      replyHours: 6,
      within48h: 0.8,
      within7d: 0.8,
      replyN: 10,
      mergeRate: 0.8889,
      decided: 9,
    });
  });

  it("gives null, not wrong figures, when the window is not fully stored", () => {
    const pulls = Array.from({ length: 2400 }, () =>
      pull({ createdAt: "2026-03-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z" }),
    );
    expect(computeSeason({ coveredSince: "2025-10-05T00:00:00.000Z", pulls }, NOW)).toBe(
      null,
    );
  });
});

describe("rememberSeason", () => {
  const figures = {
    replyHours: 6,
    within48h: 0.8,
    within7d: 0.8,
    replyN: 10,
    mergeRate: 0.9,
    decided: 9,
  };

  it("takes fresh figures and keeps old ones when the window has aged out", () => {
    const first = rememberSeason(undefined, "2026-10-01T00:00:00Z", figures);
    expect(first).toEqual({ syncedAt: "2026-10-01T00:00:00Z", figures });
    const later = { ...figures, mergeRate: 1 };
    expect(rememberSeason(first, "2026-11-01T00:00:00Z", later).figures).toEqual(later);
    const aged = rememberSeason(first, "2027-03-01T00:00:00Z", null);
    expect(aged.figures).toEqual(figures);
    expect(aged.syncedAt).toBe("2027-03-01T00:00:00Z");
  });

  it("remembers that a repository could not be measured", () => {
    expect(rememberSeason(undefined, "2026-10-01T00:00:00Z", null)).toEqual({
      syncedAt: "2026-10-01T00:00:00Z",
      figures: null,
    });
  });
});
