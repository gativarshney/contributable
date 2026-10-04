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
