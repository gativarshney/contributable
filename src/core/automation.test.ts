import { describe, expect, it } from "vitest";
import { isBot } from "./actors";
import { detectAutomation, toPullSummary } from "./github/fetch";

const hash = (login: string) => `h:${login.toLowerCase()}`;
const at = (minutes: number) =>
  new Date(Date.parse("2026-06-01T00:00:00Z") + minutes * 60_000).toISOString();

function rawPull(
  number: number,
  replies: { login: string; minutes: number; association?: string }[],
  over: Record<string, unknown> = {},
) {
  return {
    number,
    createdAt: at(0),
    closedAt: null as string | null,
    mergedAt: null as string | null,
    updatedAt: at(600),
    authorAssociation: "NONE",
    author: { __typename: "User", login: `newcomer${number}` },
    mergedBy: null as { __typename: string; login: string } | null,
    comments: {
      totalCount: replies.length,
      nodes: replies.map((r) => ({
        createdAt: at(r.minutes),
        authorAssociation: r.association ?? "MEMBER",
        author: { __typename: "User", login: r.login },
      })),
    },
    reviews: { nodes: [] },
    ...over,
  };
}

describe("automation running under user accounts", () => {
  it("recognises bot-style names without catching short surnames", () => {
    const user = (login: string) => ({ login, typename: "User", association: null });
    expect(isBot(user("flinkbot"))).toBe(true);
    expect(isBot(user("k8s-ci-robot"))).toBe(true);
    expect(isBot(user("my-bot"))).toBe(true);
    expect(isBot(user("abbot"))).toBe(false);
    expect(isBot(user("maintainer"))).toBe(false);
    expect(isBot({ login: "anything", typename: "Bot", association: null })).toBe(true);
  });

  it("finds an account that answers within a minute, again and again", () => {
    const pulls = Array.from({ length: 8 }, (_, i) =>
      rawPull(i + 1, [
        { login: "ProjectCI", minutes: 0.5 },
        { login: "alice", minutes: 300 },
      ]),
    );
    expect(detectAutomation(pulls)).toEqual(["projectci"]);
  });

  it("finds a pipeline that comments on most pull requests minutes after they open", () => {
    const pulls = Array.from({ length: 30 }, (_, i) =>
      rawPull(i + 1, i < 24 ? [{ login: "coverage-report", minutes: 9 }] : []),
    );
    expect(detectAutomation(pulls)).toEqual(["coverage-report"]);
  });

  it("leaves a fast, busy maintainer alone", () => {
    // Replies to a third of pull requests, usually within the hour, sometimes at once.
    const pulls = Array.from({ length: 30 }, (_, i) =>
      rawPull(
        i + 1,
        i % 3 === 0 ? [{ login: "alice", minutes: i === 0 ? 0.5 : 20 + i }] : [],
      ),
    );
    expect(detectAutomation(pulls)).toEqual([]);
  });

  it("ignores a detected account when summarising a pull request", () => {
    const raw = rawPull(1, [
      { login: "ProjectCI", minutes: 0.5 },
      { login: "alice", minutes: 300 },
    ]);
    expect(toPullSummary(raw, hash).firstResponseAt).toBe(at(0.5));
    const summary = toPullSummary(raw, hash, new Set(["projectci"]));
    expect(summary.firstResponseAt).toBe(at(300));
    expect(summary.coreActors).toEqual(["h:alice"]);
  });
});

describe("a merge is an answer", () => {
  it("counts a silent merge by someone else as the first response", () => {
    const raw = rawPull(2, [], {
      mergedAt: at(120),
      closedAt: at(120),
      mergedBy: { __typename: "User", login: "alice" },
    });
    const summary = toPullSummary(raw, hash);
    expect(summary.firstResponseAt).toBe(at(120));
    expect(summary.coreActors).toEqual(["h:alice"]);
  });

  it("keeps an earlier comment as the first response", () => {
    const raw = rawPull(3, [{ login: "bob", minutes: 30 }], {
      mergedAt: at(120),
      mergedBy: { __typename: "User", login: "alice" },
    });
    expect(toPullSummary(raw, hash).firstResponseAt).toBe(at(30));
  });

  it("does not count a merge by the author or by a bot", () => {
    const self = rawPull(4, [], {
      mergedAt: at(60),
      mergedBy: { __typename: "User", login: "newcomer4" },
    });
    const bot = rawPull(5, [], {
      mergedAt: at(60),
      mergedBy: { __typename: "Bot", login: "mergify" },
    });
    expect(toPullSummary(self, hash).firstResponseAt).toBeNull();
    expect(toPullSummary(bot, hash).firstResponseAt).toBeNull();
  });
});
