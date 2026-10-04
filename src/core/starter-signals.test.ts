import { describe, expect, it } from "vitest";
import { starterSignals } from "./github/fetch";

type Raw = Parameters<typeof starterSignals>[0];

const pull = (number: number, state: string) => ({
  __typename: "PullRequest",
  number,
  state,
});

function issue(events: Raw["timelineItems"]["nodes"]): Raw {
  return {
    number: 1,
    title: "Add a thing",
    createdAt: "2026-09-01T00:00:00Z",
    closedAt: null,
    updatedAt: "2026-09-20T00:00:00Z",
    authorAssociation: "NONE",
    author: { __typename: "User", login: "someone" },
    labels: { nodes: [] },
    assignees: { totalCount: 0 },
    comments: { totalCount: 0, nodes: [] },
    timelineItems: { nodes: events },
  } as unknown as Raw;
}

describe("starterSignals", () => {
  it("counts an open pull request that references the issue", () => {
    const raw = issue([{ __typename: "CrossReferencedEvent", source: pull(5, "OPEN") }]);
    expect(starterSignals(raw).linkedOpenPulls).toBe(1);
  });

  it("counts a merged pull request even when it did not close the issue", () => {
    const raw = issue([
      {
        __typename: "CrossReferencedEvent",
        willCloseTarget: false,
        source: pull(7, "MERGED"),
      },
    ]);
    expect(starterSignals(raw).linkedOpenPulls).toBe(1);
  });

  it("ignores a pull request that was closed without merging", () => {
    const raw = issue([
      { __typename: "CrossReferencedEvent", source: pull(8, "CLOSED") },
    ]);
    expect(starterSignals(raw).linkedOpenPulls).toBe(0);
  });

  it("drops a pull request that was disconnected afterwards", () => {
    const raw = issue([
      { __typename: "ConnectedEvent", subject: pull(9, "MERGED") },
      { __typename: "DisconnectedEvent", subject: pull(9, "MERGED") },
    ]);
    expect(starterSignals(raw).linkedOpenPulls).toBe(0);
  });
});
