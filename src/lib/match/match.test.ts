import { describe, expect, it } from "vitest";
import { computeMetrics } from "@/core/metrics";
import {
  availableIssues,
  PUBLISHED_VERSION,
  thinCurve,
  toIndexRow,
  type IndexRow,
  type RepoDetail,
} from "@/core/published";
import type { IssueSummary, PullSummary, RepoFacts } from "@/core/schema";
import { trend, weeklySeries } from "@/core/trends";
import { verdict } from "@/lib/repo/verdict";
import { pickRepos } from "../../../pipeline/universe/discover";
import { fits, matchProjects, parseMatch } from "./match";

const NOW = new Date("2026-10-01T00:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 86_400_000).toISOString();

const facts: RepoFacts = {
  owner: "Acme",
  name: "Widget",
  description: "A widget",
  stars: 1200,
  forks: 10,
  archived: false,
  isFork: false,
  license: "MIT",
  defaultBranch: "main",
  pushedAt: daysAgo(1),
  createdAt: daysAgo(900),
  topics: ["cli"],
  languages: { Python: 900, Shell: 60, C: 40 },
  frameworks: ["django"],
  commits90d: 40,
  releases365d: 3,
  lastReleaseAt: daysAgo(20),
  gettingStarted: {
    contributing: true,
    codeOfConduct: true,
    issueTemplates: true,
    devcontainer: false,
    cla: "dco",
    channels: [{ kind: "discord", url: "https://discord.gg/x" }],
  },
};

function pull(n: number, age: number, over: Partial<PullSummary> = {}): PullSummary {
  return {
    n,
    createdAt: daysAgo(age),
    closedAt: daysAgo(age - 3),
    mergedAt: daysAgo(age - 3),
    updatedAt: daysAgo(age - 3),
    cls: "outside",
    author: `a${n}`,
    firstResponseAt: daysAgo(age - 1),
    coreReplyAt: [daysAgo(age - 1)],
    coreActors: ["m1"],
    ...over,
  };
}

function issue(n: number, over: Partial<IssueSummary> = {}): IssueSummary {
  return {
    n,
    title: `Issue ${n}`,
    createdAt: daysAgo(10),
    closedAt: null,
    updatedAt: daysAgo(2),
    cls: "core",
    author: "m1",
    firstResponseAt: null,
    labels: ["good first issue"],
    assignees: 0,
    linkedOpenPulls: 0,
    lastClaimAt: null,
    coreReplyAt: [],
    coreActors: [],
    ...over,
  };
}

function detailOf(pulls: PullSummary[], issues: IssueSummary[]): RepoDetail {
  return {
    v: PUBLISHED_VERSION,
    owner: facts.owner,
    name: facts.name,
    updatedAt: NOW.toISOString(),
    coveredSince: daysAgo(365),
    facts,
    metrics: computeMetrics(pulls, issues, NOW),
    series: weeklySeries(pulls, NOW),
    trend: trend(pulls, NOW),
    programs: [{ program: "gsoc", slug: "acme", name: "Acme", years: [2025, 2026] }],
  };
}

describe("published shapes", () => {
  const pulls = [
    ...Array.from({ length: 8 }, (_, i) => pull(i + 1, 40 + i)),
    pull(20, 50, { mergedAt: null }),
    pull(21, 60, { mergedAt: null }),
    // Recent activity, too new to be in the cohort.
    pull(99, 5),
  ];
  const issues = [issue(1), issue(2, { assignees: 1 }), issue(3, { linkedOpenPulls: 1 })];
  const detail = detailOf(pulls, issues);

  it("turns a repository into an index row without inventing figures", () => {
    const row = toIndexRow(detail);
    expect(row.id).toBe("Acme/Widget");
    expect(row.mergeRate).toBe(0.8);
    expect(row.decided).toBe(10);
    expect(row.replyHours).toBe(24);
    expect(row.within48h).toBe(1);
    expect(row.available).toBe(1);
    // Languages under 5% of the code are left out.
    expect(row.lang).toEqual(["Python", "Shell"]);
    expect(row.gsoc).toBe("acme");
    expect(row.years).toEqual([2025, 2026]);
    expect(row.spark).toHaveLength(13);
    expect(row.spark.reduce((a, b) => a + b, 0)).toBe(11);
    // One maintainer replied: the reply-hours profile must not be published.
    expect(row.hours).toBeNull();
    expect(availableIssues(detail).map((i) => i.n)).toEqual([1]);
  });

  it("shows no figure under five pull requests", () => {
    const small = toIndexRow(detailOf(pulls.slice(0, 3), []));
    expect(small.mergeRate).toBeNull();
    expect(small.replyHours).toBeNull();
    expect(small.decided).toBe(3);
  });

  it("writes a verdict that only restates measured figures", () => {
    expect(verdict(detail)).toEqual([
      "Outside PRs: 8 in 10 merged.",
      "First reply usually within 24 h.",
      "1 starter issue is available now.",
    ]);
    expect(verdict(detailOf(pulls.slice(0, 2), []))[0]).toBe(
      "Only 2 outside PRs in the last four months, too few to rate.",
    );
    const ignored = Array.from({ length: 6 }, (_, i) =>
      pull(i + 1, 40 + i, { firstResponseAt: null, mergedAt: null, closedAt: null }),
    );
    expect(verdict(detailOf(ignored, []))).toContain(
      "More than half of outside PRs got no reply.",
    );
  });

  it("thins a long curve but keeps both ends", () => {
    const curve = Array.from({ length: 500 }, (_, i) => i);
    const thin = thinCurve(curve);
    expect(thin).toHaveLength(48);
    expect(thin[0]).toBe(0);
    expect(thin.at(-1)).toBe(499);
    expect(thinCurve([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

describe("find my project", () => {
  const base = toIndexRow(
    detailOf(
      [...Array.from({ length: 8 }, (_, i) => pull(i + 1, 40 + i)), pull(99, 5)],
      [issue(1)],
    ),
  );
  const row = (id: string, over: Partial<IndexRow> = {}): IndexRow => ({
    ...base,
    id,
    ...over,
  });

  it("needs a stack and matches it against languages, frameworks and topics", () => {
    expect(matchProjects([base], parseMatch({}))).toEqual([]);
    expect(matchProjects([base], parseMatch({ stack: "Django" }))).toHaveLength(1);
    expect(matchProjects([base], parseMatch({ stack: "rust" }))).toEqual([]);
  });

  it("orders by reply share, then merge rate, then starter issues", () => {
    const rows = [
      row("a/slow", { within48h: 0.3 }),
      row("b/fast", { within48h: 0.9, mergeRate: 0.5 }),
      row("c/fast-merges", { within48h: 0.9, mergeRate: 0.8 }),
      row("d/unmeasured", { within48h: null, replyHours: null }),
    ];
    const ids = matchProjects(rows, parseMatch({ stack: "python", level: "some" })).map(
      (m) => m.row.id,
    );
    expect(ids).toEqual(["c/fast-merges", "b/fast", "a/slow", "d/unmeasured"]);
  });

  it("applies the stated rules for goal, level and hours", () => {
    const input = parseMatch({ stack: "python" });
    expect(fits(row("x/quiet", { trend: "went-quiet" }), input)).toBe(false);
    expect(fits(row("x/no-prs", { noPulls: true }), input)).toBe(false);
    expect(fits(row("x/no-guide", { guide: false }), input)).toBe(false);
    expect(fits(row("x/slow", { replyHours: 400 }), input)).toBe(false);
    expect(fits(row("x/slow", { replyHours: 400 }), { ...input, level: "some" })).toBe(
      true,
    );
    expect(fits(row("x/not-gsoc", { gsoc: null }), { ...input, goal: "gsoc" })).toBe(
      false,
    );
    expect(fits(row("x/long", { mergeHours: 900 }), { ...input, hours: 4 })).toBe(false);
    expect(fits(row("x/long", { mergeHours: 900 }), { ...input, hours: 10 })).toBe(true);
  });

  it("gives a reason for every pick, including the sign-off requirement", () => {
    const [match] = matchProjects([base], parseMatch({ stack: "python, django" }));
    expect(match.reasons[0]).toBe("Uses Python, django.");
    expect(match.reasons).toContain("Commits need a DCO sign-off (git commit -s).");
    expect(match.reasons.some((r) => r.includes("within 48 hours (8 PRs"))).toBe(true);
  });
});

describe("repository discovery", () => {
  const repo = (name: string, over: Record<string, unknown> = {}) => ({
    name,
    isArchived: false,
    isMirror: false,
    isTemplate: false,
    isDisabled: false,
    pushedAt: daysAgo(3),
    stargazerCount: 10,
    pullRequests: { totalCount: 50 },
    ...over,
  });

  it("keeps active repositories with pull requests, most starred first", () => {
    const picked = pickRepos(
      [
        repo("small", { stargazerCount: 5 }),
        repo("big", { stargazerCount: 900 }),
        repo("archived", { isArchived: true }),
        repo("mirror", { isMirror: true }),
        repo("idle", { pushedAt: daysAgo(400) }),
        repo("no-prs", { pullRequests: { totalCount: 1 } }),
        repo(".github"),
      ],
      NOW,
    );
    expect(picked).toEqual(["big", "small"]);
  });

  it("keeps at most twelve per account", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      repo(`r${i}`, { stargazerCount: i }),
    );
    expect(pickRepos(many, NOW)).toHaveLength(12);
    expect(pickRepos(many, NOW)[0]).toBe("r19");
  });
});

describe("find my project: sample size", () => {
  const row = (id: string, over: Partial<IndexRow>): IndexRow =>
    ({
      id,
      d: "",
      stars: 1,
      lang: ["Python"],
      fw: [],
      topics: ["python"],
      gsoc: "org",
      years: [2026],
      updatedAt: "2026-10-01T00:00:00Z",
      mergeRate: 0.8,
      decided: 30,
      firstTimerRate: null,
      replyHours: 10,
      within48h: 0.8,
      within7d: 0.9,
      replyN: 30,
      mergeHours: 50,
      issueReplyHours: null,
      available: 1,
      helpWanted: 0,
      commits90d: 10,
      maintainers: 3,
      pushedAt: "2026-09-30T00:00:00Z",
      cla: "none",
      channels: [],
      guide: true,
      trend: "steady",
      spark: [],
      hours: null,
      ...over,
    }) as IndexRow;

  it("puts a well-sampled project ahead of a perfect record over a handful", () => {
    const picks = matchProjects(
      [
        row("a/lucky", { within48h: 1, replyN: 6 }),
        row("b/solid", { within48h: 0.8, replyN: 60 }),
      ],
      parseMatch({ stack: "python" }),
    );
    expect(picks.map((m) => m.row.id)).toEqual(["b/solid", "a/lucky"]);
    // The language and the topic of the same name count once.
    expect(picks[0].reasons[0]).toBe("Uses Python.");
  });
});
