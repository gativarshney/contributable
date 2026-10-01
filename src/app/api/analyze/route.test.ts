import { afterEach, describe, expect, it, vi } from "vitest";
import { createThrottle } from "@/lib/report/throttle";
import type { AnalysisEvent } from "@/lib/report/run";

// The data cache needs the Next.js server runtime; here every call is a cache miss.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));

const { GET } = await import("./route");

type Route = { status?: number; body?: unknown; headers?: Record<string, string> };

/** Stands in for api.github.com: answers by the end of the request path. */
function stubGitHub(routes: Record<string, Route>) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      const key = Object.keys(routes).find((k) => url.pathname.endsWith(k));
      const {
        status = 200,
        body = [],
        headers = {},
      } = key ? routes[key] : { status: 404 };
      return new Response(JSON.stringify(body), { status, headers });
    }),
  );
  return calls;
}

const repository: Route = {
  body: {
    name: "widget",
    full_name: "acme/widget",
    owner: { login: "acme" },
    created_at: "2020-01-01T00:00:00Z",
    license: { spdx_id: "MIT" },
  },
};

async function events(response: Response): Promise<AnalysisEvent[]> {
  const text = await response.text();
  return text
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

const request = (repo: string, address = "203.0.113.7") =>
  new Request(`https://example.test/api/analyze?repo=${encodeURIComponent(repo)}`, {
    headers: { "x-forwarded-for": `${address}, 10.0.0.1` },
  });

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/analyze", () => {
  it("rejects input that is not a GitHub repository before calling GitHub", async () => {
    const calls = stubGitHub({});
    const response = await GET(request("https://gitlab.com/group/project"));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid");
    expect(calls).toHaveLength(0);
  });

  it("streams one event per stage and then the finished report", async () => {
    stubGitHub({
      "/repos/acme/widget": repository,
      "/commits": { body: [] },
      "/releases": { body: [] },
      "/issues": { body: [] },
      "/pulls": { body: [] },
      "/issues/comments": { body: [] },
      "/pulls/comments": { body: [] },
      "/community/profile": { body: { files: {} } },
      "/languages": { body: { Go: 10 } },
    });
    const response = await GET(request("acme/widget"));
    const stream = await events(response);

    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    const stages = stream.filter((e) => e.type === "stage").map((e) => e.stage);
    expect(stages[0]).toBe("repository");
    expect(new Set(stages)).toEqual(
      new Set(["repository", "commits", "releases", "issues", "contributing", "report"]),
    );

    const last = stream.at(-1)!;
    expect(last.type).toBe("result");
    if (last.type !== "result") return;
    expect(last.report.repository.fullName).toBe("acme/widget");
    expect(last.report.checklist.checks).toHaveLength(10);
    // Lists that come back empty must read as empty, not as failures.
    expect(last.report.analysis.activity.empty).toBe(true);
    expect(last.report.analysis.releases.latest).toBeNull();
  });

  it("reports a missing repository as an error event, without a stack trace", async () => {
    stubGitHub({});
    const stream = await events(await GET(request("acme/missing")));

    expect(stream).toHaveLength(1);
    expect(stream[0]).toMatchObject({ type: "error", error: { code: "not_found" } });
    expect(JSON.stringify(stream[0])).not.toMatch(/at \w+ \(|Error:/);
  });

  it("passes GitHub's rate limit on so the browser can use its own allowance", async () => {
    stubGitHub({
      "/repos/acme/widget": {
        status: 403,
        headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1790000000" },
      },
    });
    const stream = await events(await GET(request("acme/widget")));

    expect(stream.at(-1)).toMatchObject({
      type: "error",
      error: { code: "rate_limited" },
    });
  });

  it("still returns a report when one source fails", async () => {
    stubGitHub({
      "/repos/acme/widget": repository,
      "/commits": { status: 500 },
      "/releases": { status: 502 },
    });
    const last = (await events(await GET(request("acme/widget", "203.0.113.8")))).at(-1)!;

    expect(last.type).toBe("result");
    if (last.type !== "result") return;
    expect(last.report.analysis.releases.available).toBe(false);
    expect(last.report.analysis.activity.available).toBe(false);
  });
});

describe("fresh-analysis throttle", () => {
  it("allows a burst, then refuses until the window has passed", () => {
    const allow = createThrottle(3, 1000);

    expect([allow("a", 0), allow("a", 10), allow("a", 20)]).toEqual([true, true, true]);
    expect(allow("a", 30)).toBe(false);
    expect(allow("b", 30)).toBe(true); // other clients are unaffected
    expect(allow("a", 1005)).toBe(true); // the first hit has aged out
  });

  it("sends a client over the limit to its own allowance instead of GitHub", async () => {
    const calls = stubGitHub({ "/repos/acme/widget": repository });
    const address = "198.51.100.42";
    for (let i = 0; i < 20; i++)
      await (await GET(request("acme/widget", address))).text();
    const before = calls.length;
    const stream = await events(await GET(request("acme/widget", address)));

    expect(stream.at(-1)).toMatchObject({
      type: "error",
      error: { code: "rate_limited" },
    });
    expect(calls.length).toBe(before); // the refused request never reached GitHub
  });
});
