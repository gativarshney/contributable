import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  CLAIM_WINDOW_DAYS,
  STALE_AFTER_DAYS,
  isClaimComment,
  normaliseLabel,
  starterClassOf,
  starterLabelClass,
  starterState,
  type StarterFacts,
} from "./starter";

const NOW = new Date("2026-10-01T00:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 86_400_000).toISOString();

const facts = fc.record({
  assignees: fc.integer({ min: 0, max: 3 }),
  linkedOpenPulls: fc.integer({ min: 0, max: 3 }),
  lastClaimAt: fc.option(fc.integer({ min: 0, max: 400 }).map(daysAgo), { nil: null }),
  updatedAt: fc.integer({ min: 0, max: 400 }).map(daysAgo),
});

describe("starter labels", () => {
  it("normalises separators, case and emoji", () => {
    expect(normaliseLabel("Good-First-Issue")).toBe("good first issue");
    expect(normaliseLabel("good_first_issue :wave:")).toBe("good first issue wave");
    expect(normaliseLabel("E-easy")).toBe("e easy");
  });

  it.each([
    ["good first issue", "beginner"],
    ["good-first-issue", "beginner"],
    ["Good First Issue", "beginner"],
    ["first-timers-only", "beginner"],
    ["beginner", "beginner"],
    ["easy", "beginner"],
    ["starter", "beginner"],
    ["E-easy", "beginner"],
    ["difficulty: easy", "beginner"],
    ["help wanted", "help-wanted"],
    ["help-wanted", "help-wanted"],
    ["Status: Help Wanted", "help-wanted"],
    ["bug", null],
    ["not easy", null],
    ["enhancement", null],
  ])("classifies %s as %s", (label, expected) => {
    expect(starterLabelClass(label)).toBe(expected);
  });

  it("lets beginner outrank help wanted", () => {
    expect(starterClassOf(["help wanted", "good first issue"])).toBe("beginner");
    expect(starterClassOf(["help wanted", "bug"])).toBe("help-wanted");
    expect(starterClassOf(["bug"])).toBeNull();
  });
});

describe("claim comments", () => {
  it.each([
    "Can I work on this?",
    "I'd like to take this",
    "I would love to work on this issue",
    "Please assign this to me",
    "I'm working on it",
    "Is this still available?",
    "/assign",
    "hey!\n.take",
  ])("recognises %j", (body) => expect(isClaimComment(body)).toBe(true));

  it.each([
    "This also happens on Windows.",
    "Thanks for the report, a fix would be welcome.",
    "Duplicate of #12",
    "/assign @someone-else",
  ])("ignores %j", (body) => expect(isClaimComment(body)).toBe(false));
});

describe("starterState", () => {
  const free: StarterFacts = {
    assignees: 0,
    linkedOpenPulls: 0,
    lastClaimAt: null,
    updatedAt: daysAgo(3),
  };

  it("walks through each state", () => {
    expect(starterState(free, NOW)).toBe("available");
    expect(starterState({ ...free, linkedOpenPulls: 1 }, NOW)).toBe("in-progress");
    expect(starterState({ ...free, assignees: 1 }, NOW)).toBe("claimed");
    expect(starterState({ ...free, lastClaimAt: daysAgo(2) }, NOW)).toBe("claimed");
    expect(starterState({ ...free, lastClaimAt: daysAgo(20) }, NOW)).toBe("available");
    expect(starterState({ ...free, updatedAt: daysAgo(61) }, NOW)).toBe("stale");
  });

  it("is available exactly when all four conditions hold", () => {
    fc.assert(
      fc.property(facts, (f) => {
        const claimAge = f.lastClaimAt
          ? (NOW.getTime() - Date.parse(f.lastClaimAt)) / 86_400_000
          : Infinity;
        const idle = (NOW.getTime() - Date.parse(f.updatedAt)) / 86_400_000;
        const expected =
          f.assignees === 0 &&
          f.linkedOpenPulls === 0 &&
          claimAge >= CLAIM_WINDOW_DAYS &&
          idle < STALE_AFTER_DAYS;
        expect(starterState(f, NOW) === "available").toBe(expected);
      }),
    );
  });

  it("always reports in-progress when an open pull request is linked", () => {
    fc.assert(
      fc.property(facts, (f) => {
        fc.pre(f.linkedOpenPulls > 0);
        expect(starterState(f, NOW)).toBe("in-progress");
      }),
    );
  });

  it("never calls an assigned issue available or stale", () => {
    fc.assert(
      fc.property(facts, (f) => {
        fc.pre(f.assignees > 0);
        expect(["claimed", "in-progress"]).toContain(starterState(f, NOW));
      }),
    );
  });

  it("only moves away from available as an idle issue ages", () => {
    fc.assert(
      fc.property(facts, fc.integer({ min: 1, max: 200 }), (f, days) => {
        fc.pre(f.lastClaimAt === null);
        const later = new Date(NOW.getTime() + days * 86_400_000);
        if (starterState(f, NOW) === "stale")
          expect(starterState(f, later)).toBe("stale");
      }),
    );
  });
});
