import { describe, expect, it, vi } from "vitest";
import type { StarterIssue } from "@/types";
import { createGitHubClient } from "./client";
import { fetchStarterAvailability } from "./fetchers";
import { isClaBot, isClaim, isSourceAvailable, parseCommitMessage } from "./signals";

describe("parseCommitMessage", () => {
  it("reads pull request references and co-author logins", () => {
    const message = [
      "Fix retry backoff (#412)",
      "",
      "Closes #398.",
      "",
      "Co-authored-by: Ana Silva <1234567+ana-silva@users.noreply.github.com>",
      "Co-authored-by: Ben <Ben@users.noreply.github.com>",
      "Co-authored-by: Someone Else <someone@example.com>",
    ].join("\n");

    expect(parseCommitMessage(message)).toEqual({
      refs: [412, 398],
      coAuthors: ["ana-silva", "ben"],
    });
  });

  it("returns nothing for a plain message", () => {
    expect(parseCommitMessage("Bump version")).toEqual({ refs: [], coAuthors: [] });
  });
});

describe("isClaim", () => {
  it.each([
    "Can I work on this?",
    "I'd like to take this one",
    "please assign this to me",
    "I am working on it, PR soon",
    "I'll pick this up",
    "Could I try fixing this?",
  ])("treats %j as asking to take the issue", (text) => {
    expect(isClaim(text)).toBe(true);
  });

  it.each([
    "This also happens on Windows.",
    "Is anyone working on a fix?",
    "Thanks, that worked for me.",
    "The maintainers can take their time.",
  ])("does not treat %j as a claim", (text) => {
    expect(isClaim(text)).toBe(false);
  });
});

describe("hard-block detection", () => {
  it("identifies CLA bots by login", () => {
    expect(["CLAassistant", "cla-bot", "linux-foundation-easycla"].every(isClaBot)).toBe(
      true,
    );
    expect(["claire", "declan", "dependabot[bot]"].some(isClaBot)).toBe(false);
  });

  it("identifies source-available licences", () => {
    const restricted = ["Elastic-2.0", "BUSL-1.1", "FSL-1.1-MIT", "SSPL-1.0"];
    expect(restricted.every(isSourceAvailable)).toBe(true);
    expect(["MIT", "Apache-2.0", "GPL-3.0", null].some(isSourceAvailable)).toBe(false);
  });
});

describe("fetchStarterAvailability", () => {
  const ref = { owner: "acme", name: "widget" };
  const issue: StarterIssue = {
    number: 12,
    title: "Add a flag",
    url: "",
    createdAt: "2026-01-01T00:00:00Z",
    comments: 2,
    assigned: false,
    label: "good first issue",
    byMaintainer: true,
    availability: { state: "unchecked" },
  };

  /** Asks about issue 12 against a timeline GitHub would have returned. */
  function check(timeline: unknown, status = 200) {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify(timeline), { status }),
    ) as unknown as typeof globalThis.fetch;
    return fetchStarterAvailability(createGitHubClient({ fetch }), ref, issue);
  }

  const comment = (body: string, login: string, association = "NONE") => ({
    event: "commented",
    body,
    created_at: "2026-02-01T00:00:00Z",
    author_association: association,
    user: { login, type: "User" },
  });
  const reference = (state: string) => ({
    event: "cross-referenced",
    source: {
      issue: { number: 77, state, html_url: "https://x.test/pull/77", pull_request: {} },
    },
  });

  it("is free when nobody claimed it and no open pull request refers to it", async () => {
    expect(await check([comment("Same here on Linux", "ana")])).toEqual({
      state: "free",
    });
  });

  it("is taken when an open pull request references it", async () => {
    expect(await check([reference("open")])).toEqual({
      state: "linked",
      pullRequest: 77,
      url: "https://x.test/pull/77",
    });
  });

  it("is not blocked by an abandoned, closed pull request", async () => {
    expect(await check([reference("closed")])).toEqual({ state: "free" });
  });

  it("reports the latest outside claim, ignoring maintainers and bots", async () => {
    const result = await check([
      comment("Can I work on this?", "ben"),
      comment("I'll take a look at the design", "maintainer", "MEMBER"),
      {
        ...comment("please assign this to me", "cy"),
        created_at: "2026-03-01T00:00:00Z",
      },
      {
        ...comment("I'll take this", "stale[bot]"),
        user: { login: "stale[bot]", type: "Bot" },
      },
    ]);
    expect(result).toEqual({ state: "claimed", by: "cy", at: "2026-03-01T00:00:00Z" });
  });

  it("says unchecked rather than free when the timeline cannot be read", async () => {
    expect(await check({}, 500)).toEqual({ state: "unchecked" });
  });
});
