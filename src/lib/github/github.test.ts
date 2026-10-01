import { describe, expect, it, vi } from "vitest";
import { toReportError } from "@/lib/report/run";
import { createGitHubClient, GitHubError, parseLinkHeader } from "./client";
import {
  fetchCommits,
  fetchContributors,
  fetchIssuesAndPulls,
  fetchOpenPullRequestCount,
  fetchRepository,
} from "./fetchers";
import { parseRepoInput } from "./parse";

describe("parseRepoInput", () => {
  it.each([
    ["https://github.com/vercel/next.js", "vercel", "next.js"],
    ["http://www.github.com/facebook/react/", "facebook", "react"],
    ["github.com/sindresorhus/ky", "sindresorhus", "ky"],
    ["https://github.com/vercel/next.js/tree/canary/packages", "vercel", "next.js"],
    ["https://github.com/nodejs/node.git", "nodejs", "node"],
    ["git@github.com:torvalds/linux.git", "torvalds", "linux"],
    ["  rust-lang/rust  ", "rust-lang", "rust"],
    ["https://github.com/a/b?tab=readme#top", "a", "b"],
  ])("accepts %s", (input, owner, name) => {
    expect(parseRepoInput(input)).toEqual({ ok: true, ref: { owner, name } });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["https://gitlab.com/group/project", "not_github"],
    ["https://github.com/vercel", "malformed"],
    ["https://github.com/", "malformed"],
    ["https://github.com/settings/profile", "malformed"],
    ["https://github.com/-bad/repo", "malformed"],
    ["https://github.com/owner/..", "malformed"],
    ["not a url", "malformed"],
    ["notaurl", "malformed"],
    ["ftp://github.com/a/b", "malformed"],
    ["javascript:alert(1)", "malformed"],
  ])("rejects %j as %s", (input, reason) => {
    expect(parseRepoInput(input)).toEqual({ ok: false, reason });
  });
});

describe("parseLinkHeader", () => {
  it("reads next and last page", () => {
    const header =
      '<https://api.github.com/repositories/1/pulls?state=open&per_page=1&page=2>; rel="next", <https://api.github.com/repositories/1/pulls?state=open&per_page=1&page=412>; rel="last"';
    expect(parseLinkHeader(header)).toEqual({ hasNext: true, lastPage: 412 });
    expect(parseLinkHeader(null)).toEqual({ hasNext: false, lastPage: null });
  });
});

type Route = { status?: number; body?: unknown; headers?: Record<string, string> };

/** A fetch stand-in that answers by URL substring and records what was requested. */
function fakeFetch(routes: Record<string, Route | ((url: URL) => Route)>) {
  const calls: URL[] = [];
  const impl = vi.fn(async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    calls.push(url);
    const key = Object.keys(routes).find((k) => url.pathname.endsWith(k));
    const route = key ? routes[key] : { status: 404, body: {} };
    const {
      status = 200,
      body = [],
      headers = {},
    } = typeof route === "function" ? route(url) : route;
    return new Response(JSON.stringify(body), { status, headers });
  });
  return { fetch: impl as unknown as typeof fetch, calls };
}

const ref = { owner: "acme", name: "widget" };
const since = "2026-01-01T00:00:00Z";

describe("GitHub client", () => {
  it("maps HTTP failures to error codes", async () => {
    const cases: [Route, string][] = [
      [{ status: 404 }, "not_found"],
      [
        {
          status: 403,
          headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1790000000" },
        },
        "rate_limited",
      ],
      [{ status: 429, headers: { "retry-after": "30" } }, "rate_limited"],
      [{ status: 409 }, "empty"],
      [{ status: 410 }, "gone"],
      [{ status: 403 }, "too_large"],
      [{ status: 502 }, "unavailable"],
    ];
    for (const [route, code] of cases) {
      const client = createGitHubClient({ fetch: fakeFetch({ "/x": route }).fetch });
      await expect(client.get("/x")).rejects.toMatchObject({ code });
    }
  });

  it("treats network failures as unavailable and never leaks the cause", async () => {
    const client = createGitHubClient({
      fetch: (async () => {
        throw new TypeError("getaddrinfo ENOTFOUND api.github.com");
      }) as unknown as typeof fetch,
    });
    const error = await client.get("/x").catch((e) => e);
    expect(error).toBeInstanceOf(GitHubError);
    expect(toReportError(error).message).not.toContain("ENOTFOUND");
  });

  it("sends the token only when configured", async () => {
    const { fetch } = fakeFetch({ "/x": { body: {} } });
    await createGitHubClient({ fetch, token: "secret" }).get("/x");
    await createGitHubClient({ fetch }).get("/x");
    const headers = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[1].headers.Authorization,
    );
    expect(headers).toEqual(["Bearer secret", undefined]);
  });
});

describe("fetchers", () => {
  it("normalizes repository metadata and tolerates missing fields", async () => {
    const { fetch } = fakeFetch({
      "/repos/acme/widget": {
        body: {
          name: "widget",
          full_name: "acme/widget",
          owner: { login: "acme" },
          html_url: "https://github.com/acme/widget",
          description: "",
          stargazers_count: 12,
          license: { spdx_id: "NOASSERTION", name: "Custom" },
          created_at: "2020-01-01T00:00:00Z",
        },
      },
    });
    const repo = await fetchRepository(createGitHubClient({ fetch }), ref);

    expect(repo).toMatchObject({
      fullName: "acme/widget",
      description: null,
      language: null,
      stars: 12,
      forks: 0,
      license: "Custom",
      topics: [],
      pushedAt: null,
      archived: false,
    });
  });

  it("stops at the page limit and reports how far back the data reaches", async () => {
    const page = (n: number) =>
      Array.from({ length: 2 }, (_, i) => ({
        sha: `p${n}-${i}`,
        commit: {
          committer: { date: `2026-03-0${9 - n}T0${i}:00:00Z` },
          author: { name: "Ana" },
        },
        author: i === 0 ? { login: "ana", type: "User" } : null,
      }));
    const { fetch, calls } = fakeFetch({
      "/commits": (url) => ({
        body: page(Number(url.searchParams.get("page"))),
        headers: { link: '<https://api.github.com/x?page=9>; rel="next"' },
      }),
    });
    const commits = await fetchCommits(createGitHubClient({ fetch }), ref, since, 2);

    expect(calls).toHaveLength(2);
    expect(commits.items).toHaveLength(4);
    expect(commits.complete).toBe(false);
    expect(commits.coveredSince).toBe("2026-03-07T01:00:00Z");
    expect(commits.items[0].author).toBe("ana");
    expect(commits.items[1].author).toBe("Ana");
  });

  it("treats an empty repository as a valid, empty history", async () => {
    const { fetch } = fakeFetch({
      "/commits": { status: 409, body: { message: "Git Repository is empty." } },
    });
    const commits = await fetchCommits(createGitHubClient({ fetch }), ref, since, 3);
    expect(commits).toMatchObject({
      status: "ok",
      items: [],
      complete: true,
      note: "empty",
    });
  });

  it("degrades a single section on failure but aborts on rate limits", async () => {
    const tooLarge = fakeFetch({ "/contributors": { status: 403 } });
    const contributors = await fetchContributors(
      createGitHubClient({ fetch: tooLarge.fetch }),
      ref,
    );
    expect(contributors.status).toBe("unavailable");
    expect(contributors.note).toMatch(/very large histories/);

    const limited = fakeFetch({
      "/contributors": { status: 403, headers: { "x-ratelimit-remaining": "0" } },
    });
    await expect(
      fetchContributors(createGitHubClient({ fetch: limited.fetch }), ref),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("falls back to the pulls endpoint when issues are disabled", async () => {
    const { fetch } = fakeFetch({
      "/issues": { status: 410 },
      "/pulls": {
        body: [
          {
            number: 7,
            title: "Add retry",
            created_at: "2026-02-01T00:00:00Z",
            updated_at: "2026-02-03T00:00:00Z",
            closed_at: "2026-02-03T00:00:00Z",
            merged_at: "2026-02-03T00:00:00Z",
            user: { login: "ana" },
          },
        ],
      },
    });
    const result = await fetchIssuesAndPulls(
      createGitHubClient({ fetch }),
      ref,
      since,
      3,
    );

    expect(result.note).toBe("issues_disabled");
    expect(result.items[0]).toMatchObject({
      number: 7,
      isPullRequest: true,
      mergedAt: "2026-02-03T00:00:00Z",
    });
  });

  it("reads the open pull request total from the pagination header", async () => {
    const many = fakeFetch({
      "/pulls": {
        body: [{}],
        headers: {
          link: '<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=57>; rel="last"',
        },
      },
    });
    expect(
      await fetchOpenPullRequestCount(createGitHubClient({ fetch: many.fetch }), ref),
    ).toBe(57);

    const none = fakeFetch({ "/pulls": { body: [] } });
    expect(
      await fetchOpenPullRequestCount(createGitHubClient({ fetch: none.fetch }), ref),
    ).toBe(0);
  });
});

describe("toReportError", () => {
  it("produces user-facing copy for each failure", () => {
    expect(toReportError(new GitHubError("not_found", 404)).message).toMatch(
      /couldn't find that public repository/,
    );
    expect(
      toReportError(new GitHubError("rate_limited", 403, 1790000000)).message,
    ).toMatch(/resets at \d\d:\d\d UTC/);
    expect(toReportError(new Error("boom")).code).toBe("unavailable");
  });
});
