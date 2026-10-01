import { describe, expect, it } from "vitest";
import { buildSampleDataset } from "@/lib/sample/dataset";
import { buildChecklist } from "@/lib/insights/checklist";
import type {
  Association,
  Collection,
  Commit,
  IssueItem,
  Release,
  StarterIssue,
  ThreadComment,
} from "@/types";
import { calculateActivity } from "./activity";
import {
  calculateContributingSignals,
  calculateStack,
  firstResponseAt,
  weekSlot,
} from "./contributing";
import { calculateContributorConcentration } from "./contributors";
import { analyze, calculateRepositoryAge } from "./index";
import { calculateIssueSignals, calculatePullRequestSignals } from "./issues";
import { calculateReleaseCadence } from "./releases";
import { busiest, toLocalGrid } from "./rhythm";
import { DAY_MS, median } from "./time";

const NOW = new Date("2026-06-30T00:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY_MS).toISOString();

const commit = (daysAgo: number, author = "ana", isBot = false): Commit => ({
  sha: `${daysAgo}-${author}`,
  date: ago(daysAgo),
  author,
  login: author,
  isBot,
  url: "",
});

function collection<T>(
  items: T[],
  overrides: Partial<Collection<T>> = {},
): Collection<T> {
  return { status: "ok", items, complete: true, coveredSince: ago(90), ...overrides };
}

describe("median", () => {
  it("handles empty, odd and even inputs", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });
});

describe("calculateActivity", () => {
  it("counts commits, active days and change per window", () => {
    const commits = [
      commit(0.5),
      commit(0.6),
      commit(3),
      commit(20),
      commit(45),
      commit(50),
    ];
    const result = calculateActivity(collection(commits), NOW);

    expect(result.windows[7]).toMatchObject({ commits: 3, activeDays: 2, covered: true });
    expect(result.windows[30]).toMatchObject({
      commits: 4,
      previousCommits: 2,
      changePct: 100,
    });
    expect(result.windows[90].commits).toBe(6);
    expect(result.windows[90].previousCommits).toBeNull();
    expect(result.daily).toHaveLength(90);
    expect(result.daily.reduce((sum, d) => sum + d.count, 0)).toBe(6);
  });

  it("does not report windows the truncated list cannot cover", () => {
    const commits = collection([commit(1), commit(5)], {
      complete: false,
      coveredSince: ago(10),
    });
    const result = calculateActivity(commits, NOW);

    expect(result.windows[7].covered).toBe(true);
    expect(result.windows[30].covered).toBe(false);
    expect(result.longestQuietDays).toBeNull();
  });

  it("keeps the last commit date when nothing falls inside the windows", () => {
    const result = calculateActivity(collection([commit(400)]), NOW);

    expect(result.windows[90].commits).toBe(0);
    expect(result.lastCommitAt).toBe(ago(400));
    expect(result.longestQuietDays).toBe(90);
  });

  it("flags empty and unavailable histories", () => {
    expect(calculateActivity(collection<Commit>([]), NOW).empty).toBe(true);
    const down = calculateActivity(
      collection<Commit>([], { status: "unavailable" }),
      NOW,
    );
    expect(down.available).toBe(false);
    expect(down.windows[7].covered).toBe(false);
  });
});

describe("calculateContributorConcentration", () => {
  it("calculates shares over human-authored commits only", () => {
    const commits = [
      ...Array.from({ length: 6 }, (_, i) => commit(i, "ana")),
      ...Array.from({ length: 3 }, (_, i) => commit(i, "ben")),
      commit(1, "cy"),
      ...Array.from({ length: 5 }, (_, i) => commit(i, "renovate[bot]", true)),
    ];
    const result = calculateContributorConcentration(commits);

    expect(result).toMatchObject({
      totalCommits: 15,
      botCommits: 5,
      humanCommits: 10,
      contributors: 3,
      topShare: 60,
      top3Share: 100,
      halfCount: 1,
    });
    expect(result.distribution[0]).toEqual({
      name: "ana",
      login: "ana",
      commits: 6,
      share: 60,
    });
  });

  it("finds how many authors make up half of the commits", () => {
    const commits = ["a", "a", "a", "b", "b", "b", "c", "c", "d", "e"].map((n, i) =>
      commit(i, n),
    );
    expect(calculateContributorConcentration(commits).halfCount).toBe(2);
  });

  it("returns null shares when there is nothing to measure", () => {
    const result = calculateContributorConcentration([commit(1, "bot", true)]);
    expect(result).toMatchObject({ topShare: null, top3Share: null, halfCount: null });
  });
});

describe("calculateReleaseCadence", () => {
  const release = (daysAgo: number, tag: string, prerelease = false): Release => ({
    tag,
    publishedAt: ago(daysAgo),
    prerelease,
    url: "",
  });

  it("derives intervals from consecutive publish dates", () => {
    const releases = [
      release(10, "v3"),
      release(40, "v2"),
      release(50, "v1"),
      release(400, "v0"),
    ];
    const result = calculateReleaseCadence(collection(releases), NOW);

    expect(result.latest?.tag).toBe("v3");
    expect(result.daysSinceLatest).toBe(10);
    expect(result.medianIntervalDays).toBe(30);
    expect(result.shortestIntervalDays).toBe(10);
    expect(result.longestIntervalDays).toBe(350);
    expect(result.last90).toBe(3);
    expect(result.last365).toBe(3);
  });

  it("handles repositories with zero or one release", () => {
    const none = calculateReleaseCadence(collection<Release>([]), NOW);
    expect(none).toMatchObject({
      latest: null,
      daysSinceLatest: null,
      medianIntervalDays: null,
    });

    const one = calculateReleaseCadence(collection([release(3, "v1")]), NOW);
    expect(one).toMatchObject({ count: 1, daysSinceLatest: 3, medianIntervalDays: null });
  });
});

const item = (
  number: number,
  created: number,
  closed: number | null,
  extra: Partial<IssueItem> = {},
): IssueItem => ({
  number,
  title: `#${number}`,
  isPullRequest: false,
  createdAt: ago(created),
  closedAt: closed === null ? null : ago(closed),
  mergedAt: null,
  author: "ana",
  association: "team",
  labels: [],
  url: "",
  ...extra,
});
const pr = (
  number: number,
  created: number,
  closed: number | null,
  merged: boolean,
  extra: Partial<IssueItem> = {},
) =>
  item(number, created, closed, {
    isPullRequest: true,
    mergedAt: merged && closed !== null ? ago(closed) : null,
    ...extra,
  });

describe("contributing signals", () => {
  const outsider = { author: "newcomer", association: "community" } as const;
  const comment = (
    issueNumber: number,
    daysAgo: number,
    author: string,
    association: Association = "team",
  ): ThreadComment => ({
    issueNumber,
    createdAt: ago(daysAgo),
    author,
    association,
  });
  const none = collection<StarterIssue>([], { coveredSince: null });

  it("measures how community pull requests fare, separately from the team's", () => {
    const items = [
      pr(1, 10, 6, true, outsider), // merged after 4 days
      pr(2, 12, 2, true, outsider), // merged after 10 days
      pr(3, 9, 5, false, outsider), // closed without merge
      pr(4, 3, null, false, outsider), // still open
      pr(5, 8, 7, true), // team
      pr(6, 5, 4, true, { author: "renovate[bot]", association: "bot" }),
    ];
    const result = calculateContributingSignals(
      collection(items),
      collection([]),
      none,
      null,
      NOW,
    );

    expect(result.windows[30]).toMatchObject({
      communityOpened: 4,
      humanOpened: 5,
      communityMerged: 2,
      communityClosedUnmerged: 1,
      mergeShare: 67,
      medianDaysToMerge: 7,
    });
    expect(result.files).toBeNull();
  });

  it("finds the first human response and ignores bots and the author", () => {
    const thread = item(7, 10, null, outsider);
    const comments = [
      comment(7, 9.9, "welcome[bot]", "bot"),
      comment(7, 9.5, "newcomer"),
      comment(7, 8, "maintainer"),
      comment(7, 6, "someone-else"),
    ];
    expect(firstResponseAt(thread, comments)).toBe(ago(8));
    expect(firstResponseAt(thread, comments.slice(0, 2))).toBeNull();
  });

  it("treats a merge as a response when nobody commented first", () => {
    const merged = pr(8, 10, 9, true, outsider);
    expect(firstResponseAt(merged, undefined)).toBe(ago(9));
    expect(firstResponseAt(merged, [comment(8, 9.5, "maintainer")])).toBe(ago(9.5));
  });

  it("summarises responses across community threads only", () => {
    const items = [
      item(1, 10, null, outsider), // answered after 2 days
      item(2, 8, null, outsider), // no answer
      pr(3, 6, 5, true, outsider), // merged after 1 day
      item(4, 5, null), // team thread, not counted
    ];
    const comments = [comment(1, 8, "maintainer"), comment(4, 4, "newcomer")];
    const result = calculateContributingSignals(
      collection(items),
      collection(comments),
      none,
      null,
      NOW,
    );

    expect(result.windows[30]).toMatchObject({
      responseCovered: true,
      threads: 3,
      answered: 2,
      medianHoursToResponse: 36,
    });
  });

  it("does not report response times the comment list cannot cover", () => {
    const comments = collection([comment(1, 3, "maintainer")], {
      complete: false,
      coveredSince: ago(10),
    });
    const result = calculateContributingSignals(
      collection([item(1, 5, null, outsider)]),
      comments,
      none,
      null,
      NOW,
    );

    expect(result.windows[7].responseCovered).toBe(true);
    expect(result.windows[30].responseCovered).toBe(false);
    expect(result.windows[30].covered).toBe(true);
  });

  it("counts starter issues that are still unassigned and lists community files", () => {
    const starter = (number: number, age: number, assigned: boolean): StarterIssue => ({
      number,
      title: `Starter ${number}`,
      url: "",
      createdAt: ago(age),
      comments: 0,
      assigned,
      label: "good first issue",
    });
    const result = calculateContributingSignals(
      collection<IssueItem>([]),
      collection([]),
      collection([starter(1, 10, false), starter(2, 40, true), starter(3, 100, false)], {
        coveredSince: null,
      }),
      {
        readme: "https://example.test/readme",
        contributing: null,
        codeOfConduct: null,
        license: "",
        issueTemplate: null,
        pullRequestTemplate: null,
      },
      NOW,
    );

    expect(result.starter).toMatchObject({ total: 3, unassigned: 2, medianAgeDays: 40 });
    expect(result.starter.issues.map((i) => i.number)).toEqual([1, 3]);
    expect(result.files?.filter((f) => f.url !== null).map((f) => f.key)).toEqual([
      "readme",
      "license",
    ]);
  });
});

describe("people, rhythm and stack", () => {
  const outsider = { author: "newcomer", association: "community" } as const;
  const reply = (issueNumber: number, at: string, author: string): ThreadComment => ({
    issueNumber,
    createdAt: at,
    author,
    association: "team",
  });

  it("ranks team members by the community threads they reply on", () => {
    const items = [
      item(1, 10, null, outsider),
      item(2, 9, null, outsider),
      item(3, 8, null),
    ];
    const comments = [
      reply(1, ago(9), "mia"),
      reply(1, ago(8), "mia"),
      reply(2, ago(7), "mia"),
      reply(2, ago(6), "raj"),
      reply(3, ago(5), "raj"), // on a team thread: not a reply to the community
      { ...reply(1, ago(4), "newcomer"), association: "community" as const },
    ];
    const result = calculateContributingSignals(
      collection(items),
      collection(comments),
      collection<StarterIssue>([], { coveredSince: null }),
      null,
      NOW,
    );

    expect(result.responders).toEqual([
      { login: "mia", replies: 3, threads: 2 },
      { login: "raj", replies: 1, threads: 1 },
    ]);
    // Every team comment counts towards the weekly rhythm, wherever it was left.
    expect(result.rhythm.total).toBe(5);
    expect(result.rhythm.slots.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it("places timestamps in half-hour slots of a UTC week", () => {
    expect(weekSlot("2026-06-28T00:00:00Z")).toBe(0); // Sunday midnight
    expect(weekSlot("2026-06-28T00:45:00Z")).toBe(1);
    expect(weekSlot("2026-06-29T13:10:00Z")).toBe(48 + 26); // Monday 13:00
    expect(weekSlot("2026-07-04T23:59:00Z")).toBe(335); // Saturday, last slot
  });

  it("counts labels on recently opened threads only", () => {
    const items = [
      item(1, 5, null, { labels: ["bug", "docs"] }),
      item(2, 20, null, { labels: ["bug"] }),
      item(3, 200, 10, { labels: ["bug", "ancient"] }),
    ];
    const result = calculateContributingSignals(
      collection(items),
      collection([]),
      collection<StarterIssue>([], { coveredSince: null }),
      null,
      NOW,
    );
    expect(result.labels).toEqual([
      { name: "bug", count: 2 },
      { name: "docs", count: 1 },
    ]);
  });

  it("turns language bytes into shares and folds the tail into Other", () => {
    expect(calculateStack(null)).toEqual([]);
    expect(calculateStack({})).toEqual([]);
    const stack = calculateStack({ TypeScript: 9000, CSS: 900, Shell: 95, Makefile: 5 });
    expect(stack).toEqual([
      { name: "TypeScript", share: 90 },
      { name: "CSS", share: 9 },
      { name: "Other", share: 1 },
    ]);
  });
});

describe("contributor checklist", () => {
  it("answers each question from the example data and counts favourable ones", () => {
    const dataset = buildSampleDataset();
    const checklist = buildChecklist(dataset.repository, analyze(dataset));
    const byId = Object.fromEntries(checklist.checks.map((c) => [c.id, c]));

    expect(checklist.checks).toHaveLength(10);
    expect(byId.license.state).toBe("yes");
    expect(byId["latest-commit"].state).toBe("yes");
    expect(byId.guide.state).toBe("no");
    expect(byId.starter.answer).toContain("5 unassigned issues");
    expect(checklist.favourable).toBe(
      checklist.checks.filter((c) => c.state === "yes").length,
    );
    expect(checklist.decided).toBeLessThanOrEqual(checklist.checks.length);
  });

  it("says unknown instead of guessing when there is too little to go on", () => {
    const dataset = buildSampleDataset();
    dataset.issues = collection<IssueItem>([], {
      coveredSince: dataset.issues.coveredSince,
    });
    dataset.comments = collection<ThreadComment>([], { status: "unavailable" });
    dataset.community = null;
    const checklist = buildChecklist(dataset.repository, analyze(dataset));
    const state = (id: string) => checklist.checks.find((c) => c.id === id)?.state;

    expect(state("community-merged")).toBe("unknown");
    expect(state("responsive")).toBe("unknown");
    expect(state("guide")).toBe("unknown");
    expect(state("issues-closed")).toBe("no");
    expect(state("license")).toBe("yes"); // still known from repository metadata
  });

  it("puts an archived repository first and marks it unfavourable", () => {
    const dataset = buildSampleDataset();
    dataset.repository.archived = true;
    const checklist = buildChecklist(dataset.repository, analyze(dataset));

    expect(checklist.checks[0]).toMatchObject({ id: "archived", state: "no" });
    expect(checklist.checks).toHaveLength(11);
  });
});

describe("issue and pull request signals", () => {
  const items = [
    item(1, 5, 1),
    item(2, 20, null),
    item(3, 200, 10), // old issue closed inside the window
    pr(4, 6, 2, true),
    pr(5, 12, 4, false),
    pr(6, 3, null, false),
  ];

  it("separates issues from pull requests", () => {
    const issues = calculateIssueSignals(collection(items), 7, NOW);

    expect(issues.openNow).toBe(7);
    expect(issues.windows[30]).toMatchObject({
      opened: 2,
      resolved: 2,
      closedUnmerged: 0,
    });
    // Median of 4 days (issue 1) and 190 days (issue 3).
    expect(issues.windows[30].medianDaysToResolve).toBe(97);
    expect(issues.windows[7]).toMatchObject({ opened: 1, resolved: 1 });
  });

  it("counts merged and closed-unmerged pull requests", () => {
    const pulls = calculatePullRequestSignals(collection(items), 3, NOW);

    expect(pulls.windows[30]).toMatchObject({
      opened: 3,
      resolved: 1,
      closedUnmerged: 1,
      medianDaysToResolve: 4,
    });
    expect(pulls.lastResolvedAt).toBe(ago(2));
    expect(pulls.weekly).toHaveLength(13);
    expect(pulls.weekly.reduce((sum, w) => sum + w.opened, 0)).toBe(3);
  });

  it("reports issues as unavailable when they are disabled", () => {
    const disabled = collection(items, { note: "issues_disabled" });
    expect(calculateIssueSignals(disabled, null, NOW).available).toBe(false);
    expect(calculatePullRequestSignals(disabled, 3, NOW).available).toBe(true);
  });
});

describe("calculateRepositoryAge", () => {
  it("reports whole days and fractional years", () => {
    expect(calculateRepositoryAge(ago(731), NOW)).toEqual({ ageDays: 731, ageYears: 2 });
  });
});

describe("analyze", () => {
  it("is deterministic for the same dataset", () => {
    const dataset = buildSampleDataset();
    expect(analyze(dataset)).toEqual(analyze(buildSampleDataset()));
  });

  it("derives open issues by subtracting open pull requests", () => {
    expect(analyze(buildSampleDataset()).issues.openNow).toBe(96 - 23);
  });

  it("sums daily commits into twelve weekly totals", () => {
    const commits = [commit(0.5), commit(1), commit(8), commit(80), commit(89)];
    const { weekly, daily } = calculateActivity(collection(commits), NOW);

    expect(weekly).toHaveLength(12);
    expect(weekly[11].count).toBe(2); // the last seven days
    expect(weekly[10].count).toBe(1);
    expect(weekly[0].count).toBe(1); // day 80 falls in the first week; day 89 is before it
    expect(weekly[0].start).toBe(daily[6].date);
  });
});

describe("reply buckets and fair response checks", () => {
  const outsider = { author: "newcomer", association: "community" } as const;
  const reply = (issueNumber: number, daysAgo: number): ThreadComment => ({
    issueNumber,
    createdAt: ago(daysAgo),
    author: "maintainer",
    association: "team",
  });
  const none = collection<StarterIssue>([], { coveredSince: null });

  it("sorts community threads by how long the first reply took", () => {
    const items = [
      item(1, 20, null, outsider), // replied after 12 hours
      item(2, 20, null, outsider), // replied after 3 days
      item(3, 20, null, outsider), // replied after 10 days
      item(4, 20, 15, outsider), // closed, nobody commented
      item(5, 20, null, outsider), // still waiting
      item(6, 1, null, outsider), // one day old: too new to judge
      pr(7, 10, null, false, outsider), // open community pull request
    ];
    const comments = [reply(1, 19.5), reply(2, 17), reply(3, 10)];
    const w = calculateContributingSignals(
      collection(items),
      collection(comments),
      none,
      null,
      NOW,
    ).windows[30];

    expect(w.replies).toEqual({
      withinDay: 1,
      withinWeek: 1,
      later: 1,
      closedQuietly: 1,
      waiting: 3,
    });
    expect(w.communityStillOpen).toBe(1);
    // Thread 6 is younger than two days, so it is not held against the maintainers.
    expect(w.matureThreads).toBe(6);
    expect(w.matureHandled).toBe(4);
  });

  it("does not fail a project for closing drive-by pull requests if others are merged", () => {
    const dataset = buildSampleDataset();
    const merged = [1, 2, 3].map((n) => pr(n, 20, 10, true, outsider));
    const rejected = Array.from({ length: 9 }, (_, n) =>
      pr(10 + n, 20, 19, false, outsider),
    );
    dataset.fetchedAt = NOW.toISOString();
    dataset.issues = collection([...merged, ...rejected]);
    const checklist = buildChecklist(dataset.repository, analyze(dataset));
    const check = checklist.checks.find((c) => c.id === "community-merged");

    expect(check?.state).toBe("yes");
    expect(check?.answer).toContain("3 community pull requests merged");
    expect(check?.answer).toContain("out of 12 closed");
  });

  it("says no when outside pull requests are closed and none merged", () => {
    const dataset = buildSampleDataset();
    dataset.fetchedAt = NOW.toISOString();
    dataset.issues = collection([1, 2, 3, 4].map((n) => pr(n, 20, 19, false, outsider)));
    const checklist = buildChecklist(dataset.repository, analyze(dataset));
    expect(checklist.checks.find((c) => c.id === "community-merged")?.state).toBe("no");
  });
});

describe("reply rhythm", () => {
  const slots = () => new Array<number>(336).fill(0);

  it("shifts UTC half-hour slots into a local time zone", () => {
    const utc = slots();
    utc[weekSlot("2026-06-29T23:30:00Z")] = 4; // Monday 23:30 UTC
    const grid = toLocalGrid(utc, 330); // India, UTC+5:30

    // 23:30 Monday + 5:30 = 05:00 Tuesday. Index is hour * 7 + weekday.
    expect(grid[5 * 7 + 2]).toBe(4);
    expect(grid.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it("wraps around the week in both directions", () => {
    const utc = slots();
    utc[0] = 1; // Sunday 00:00 UTC
    utc[335] = 2; // Saturday 23:30 UTC
    expect(toLocalGrid(utc, -60)[23 * 7 + 6]).toBe(1); // back to Saturday 23:00
    expect(toLocalGrid(utc, 60)[0 * 7 + 0]).toBe(2); // forward to Sunday 00:00
  });

  it("names the busiest weekday and three-hour stretch", () => {
    const grid = new Array<number>(168).fill(0);
    grid[14 * 7 + 2] = 5; // Tuesday 14:00
    grid[15 * 7 + 2] = 6;
    grid[16 * 7 + 3] = 4; // Wednesday 16:00
    grid[3 * 7 + 6] = 2; // Saturday 03:00
    expect(busiest(grid)).toEqual({ day: "Tuesday", from: 14, to: 17 });
  });
});
