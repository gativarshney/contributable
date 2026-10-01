import { describe, expect, it } from "vitest";
import { buildFindings } from "@/lib/insights/findings";
import { buildSampleDataset } from "@/lib/sample/dataset";
import type { Collection, Commit, IssueItem, Release } from "@/types";
import { calculateActivity } from "./activity";
import { calculateContributorConcentration } from "./contributors";
import { analyze, calculateRepositoryAge } from "./index";
import { calculateIssueSignals, calculatePullRequestSignals } from "./issues";
import { calculateReleaseCadence } from "./releases";
import { DAY_MS, median } from "./time";

const NOW = new Date("2026-06-30T00:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY_MS).toISOString();

const commit = (daysAgo: number, author = "ana", isBot = false): Commit => ({
  sha: `${daysAgo}-${author}`,
  date: ago(daysAgo),
  author,
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
    expect(result.distribution[0]).toEqual({ name: "ana", commits: 6, share: 60 });
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

describe("issue and pull request signals", () => {
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
    url: "",
    ...extra,
  });
  const pr = (number: number, created: number, closed: number | null, merged: boolean) =>
    item(number, created, closed, {
      isPullRequest: true,
      mergedAt: merged && closed !== null ? ago(closed) : null,
    });

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

  it("produces findings backed by the calculated numbers", () => {
    const dataset = buildSampleDataset();
    const analysis = analyze(dataset);
    const findings = buildFindings(dataset.repository, analysis);
    const active = findings.find((f) => f.id === "active");

    expect(analysis.issues.openNow).toBe(96 - 23);
    expect(active?.statement).toContain(String(analysis.activity.windows[30].commits));
    expect(findings.length).toBeLessThanOrEqual(6);
  });

  it("leads with the archived finding and stays quiet without data", () => {
    const dataset = buildSampleDataset();
    dataset.repository.archived = true;
    dataset.commits = collection<Commit>([], {
      coveredSince: dataset.commits.coveredSince,
    });
    dataset.releases = collection<Release>([]);
    dataset.issues = collection<IssueItem>([], {
      coveredSince: dataset.issues.coveredSince,
    });
    const findings = buildFindings(dataset.repository, analyze(dataset));

    expect(findings[0].id).toBe("archived");
    expect(findings.map((f) => f.id)).toContain("no-releases");
    expect(findings.map((f) => f.id)).not.toContain("concentrated");
  });
});
