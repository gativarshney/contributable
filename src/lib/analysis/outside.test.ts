import { describe, expect, it } from "vitest";
import { buildChecklist } from "@/lib/insights/checklist";
import { buildSampleDataset } from "@/lib/sample/dataset";
import type { Collection, Commit, IssueItem, StarterIssue, ThreadComment } from "@/types";
import { calculateContributingSignals, landedByCommit } from "./contributing";
import { analyze } from "./index";
import { DAY_MS } from "./time";

const NOW = new Date("2026-06-30T00:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY_MS).toISOString();

function collection<T>(
  items: T[],
  overrides: Partial<Collection<T>> = {},
): Collection<T> {
  return { status: "ok", items, complete: true, coveredSince: ago(90), ...overrides };
}

const commit = (daysAgo: number, extra: Partial<Commit> = {}): Commit => ({
  sha: `c${daysAgo}`,
  date: ago(daysAgo),
  author: "maintainer",
  login: "maintainer",
  isBot: false,
  refs: [],
  coAuthors: [],
  url: "",
  ...extra,
});

/** A pull request opened `created` days ago and closed `closed` days ago. */
const pull = (
  number: number,
  created: number,
  closed: number | null,
  merged: boolean,
  association: IssueItem["association"] = "community",
): IssueItem => ({
  number,
  title: `Pull request ${number}`,
  isPullRequest: true,
  createdAt: ago(created),
  closedAt: closed === null ? null : ago(closed),
  mergedAt: merged && closed !== null ? ago(closed) : null,
  author: association === "team" ? "maintainer" : "newcomer",
  association,
  labels: [],
  url: `https://example.test/pull/${number}`,
});

const none = collection<StarterIssue>([], { coveredSince: null });
const run = (
  items: IssueItem[],
  extra: { commits?: Commit[]; openPullRequests?: number | null } = {},
) =>
  calculateContributingSignals(collection(items), collection([]), none, null, NOW, extra);

describe("evidence for outside merges", () => {
  it("keeps the latest merged community pull requests, newest first", () => {
    const items = [
      pull(1, 20, 18, true),
      pull(2, 10, 9, true),
      pull(3, 8, 3, true),
      pull(4, 6, 5, true, "team"), // the team's own work is not evidence of outside merges
    ];
    const { merged, humanMerged, teamMedianDaysToMerge, medianDaysToMerge } =
      run(items).windows[30];

    expect(merged.map((m) => m.number)).toEqual([3, 2, 1]);
    expect(merged[0]).toMatchObject({ author: "newcomer", daysToMerge: 5 });
    expect(humanMerged).toBe(4);
    expect(medianDaysToMerge).toBe(2);
    expect(teamMedianDaysToMerge).toBe(1);
  });
});

describe("hidden merges", () => {
  const closed = pull(41, 10, 5, false);

  it("counts a later commit that mentions the pull request", () => {
    expect(landedByCommit(closed, [commit(4, { refs: [41] })])).toBe(true);
  });

  it("counts a commit near the close that credits or is by the author", () => {
    expect(landedByCommit(closed, [commit(4.5, { coAuthors: ["newcomer"] })])).toBe(true);
    expect(landedByCommit(closed, [commit(5.5, { login: "Newcomer" })])).toBe(true);
  });

  it("ignores unrelated, earlier and much later commits", () => {
    const commits = [
      commit(4),
      commit(12, { refs: [41] }), // before the pull request existed
      commit(1, { coAuthors: ["newcomer"] }), // credited, but days after the close
    ];
    expect(landedByCommit(closed, commits)).toBe(false);
  });

  it("never applies to a pull request that was merged normally or is still open", () => {
    const mention = [commit(1, { refs: [42, 43] })];
    expect(landedByCommit(pull(42, 10, 5, true), mention)).toBe(false);
    expect(landedByCommit(pull(43, 10, null, false), mention)).toBe(false);
  });

  it("is reported beside the closed count, not instead of it", () => {
    const window = run([closed, pull(44, 9, 6, false)], {
      commits: [commit(4, { refs: [41] })],
    }).windows[30];
    expect(window).toMatchObject({ communityClosedUnmerged: 2, landedOtherwise: 1 });
  });

  it("counts towards outside pull requests being merged on the checklist", () => {
    const dataset = buildSampleDataset();
    dataset.fetchedAt = NOW.toISOString();
    const pulls = [1, 2, 3].map((n) => pull(n, 20, 10, false));
    dataset.issues = collection(pulls);
    dataset.commits = collection(pulls.map((p) => commit(9, { refs: [p.number] })));
    const check = buildChecklist(dataset.repository, analyze(dataset)).checks.find(
      (c) => c.id === "community-merged",
    );

    expect(check?.state).toBe("yes");
    expect(check?.answer).toContain("3 more landed as commits");
  });
});

describe("review queue", () => {
  it("divides open pull requests by the weekly merge pace", () => {
    const merged = Array.from({ length: 26 }, (_, n) =>
      pull(n + 1, 60, 30 + n, true, "team"),
    );
    // 26 merged over 90 days is about 2 a week, so 60 open is roughly 30 weeks of queue.
    expect(run(merged, { openPullRequests: 60 }).queue).toEqual({
      open: 60,
      mergedPerWeek: 2,
      weeks: 30,
    });
  });

  it("is unknown without an open count, and has no length when nothing merges", () => {
    expect(run([pull(1, 20, 10, true)]).queue).toBeNull();
    expect(run([], { openPullRequests: 5 }).queue).toEqual({
      open: 5,
      mergedPerWeek: 0,
      weeks: null,
    });
  });
});

describe("hard blocks", () => {
  it("spots a contributor licence agreement bot among commenters", () => {
    const comments: ThreadComment[] = [
      {
        issueNumber: 1,
        createdAt: ago(2),
        author: "CLAassistant",
        association: "community",
      },
      { issueNumber: 1, createdAt: ago(1), author: "claire", association: "community" },
    ];
    const result = calculateContributingSignals(
      collection<IssueItem>([]),
      collection(comments),
      none,
      null,
      NOW,
    );
    expect(result.claBot).toBe("CLAassistant");
    expect(run([]).claBot).toBeNull();
  });

  it("does not call a source-available licence open source", () => {
    const dataset = buildSampleDataset();
    dataset.repository.license = "Elastic-2.0";
    const check = buildChecklist(dataset.repository, analyze(dataset)).checks[0];

    expect(check).toMatchObject({ id: "license", state: "no" });
    expect(check.answer).toContain("source-available");
  });
});
