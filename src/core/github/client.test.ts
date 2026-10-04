import { describe, expect, it } from "vitest";
import { createClient } from "./client";

const ok = (data: unknown) =>
  new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("createClient", () => {
  it("retries a response that GitHub cut short", async () => {
    const replies = [
      () => new Response('{"data":{"repository":{"name":"ab', { status: 200 }),
      () => ok({ repository: { name: "abc" } }),
    ];
    let calls = 0;
    const client = createClient({
      token: "t",
      fetchImpl: (async () => replies[calls++]()) as typeof fetch,
      sleep: async () => {},
    });
    const data = await client.query<{ repository: { name: string } }>("query {}", {});
    expect(data.repository.name).toBe("abc");
    expect(calls).toBe(2);
  });

  it("retries a dropped connection", async () => {
    let calls = 0;
    const client = createClient({
      token: "t",
      fetchImpl: (async () => {
        calls += 1;
        if (calls === 1) throw new TypeError("fetch failed");
        return ok({ viewer: { login: "x" } });
      }) as typeof fetch,
      sleep: async () => {},
    });
    await client.query("query {}", {});
    expect(calls).toBe(2);
  });

  it("gives up with an error after the retries run out", async () => {
    const client = createClient({
      token: "t",
      retries: 1,
      fetchImpl: (async () => new Response("{", { status: 200 })) as typeof fetch,
      sleep: async () => {},
    });
    await expect(client.query("query {}", {})).rejects.toThrow("incomplete response");
  });
});

describe("paginate", () => {
  it("asks for smaller pages when GitHub keeps cutting a page short", async () => {
    const { paginate } = await import("./fetch");
    const { GitHubError } = await import("./client");
    const sizes: number[] = [];
    const client = {
      budget: { spent: 0, calls: 0, last: null },
      async query(_text: string, variables: Record<string, unknown>) {
        const first = variables.first as number;
        sizes.push(first);
        if (first > 10)
          throw new GitHubError("GitHub sent an incomplete response", "upstream");
        return {
          list: { nodes: [1, 2, 3], pageInfo: { hasNextPage: false, endCursor: null } },
        };
      },
    };
    const result = await paginate<number>(
      client as never,
      "query",
      {},
      (d: {
        list: {
          nodes: number[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      }) => d.list,
      () => true,
      5,
      40,
    );
    expect(sizes).toEqual([40, 20, 10]);
    expect(result.items).toEqual([1, 2, 3]);
  });
});
