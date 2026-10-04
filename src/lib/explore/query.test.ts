import { describe, expect, it } from "vitest";
import type { IndexRow } from "@/core/published";
import { orgStats, rankOrgs, startingRepo, type GsocOrgInfo } from "@/lib/gsoc/orgs";
import {
  explore,
  facet,
  filterRows,
  overlapShare,
  parseQuery,
  sortRows,
  toSearch,
} from "./query";

const row = (id: string, over: Partial<IndexRow> = {}): IndexRow => ({
  id,
  d: "",
  stars: 10,
  lang: ["Python"],
  fw: [],
  topics: [],
  gsoc: null,
  years: [],
  updatedAt: "2026-10-01T00:00:00Z",
  mergeRate: 0.7,
  decided: 20,
  firstTimerRate: null,
  replyHours: 24,
  within48h: 0.8,
  within7d: 0.9,
  replyN: 20,
  mergeHours: 72,
  issueReplyHours: 10,
  available: 0,
  helpWanted: 0,
  commits90d: 50,
  maintainers: 3,
  pushedAt: "2026-09-30T00:00:00Z",
  cla: "none",
  channels: [],
  guide: true,
  trend: "steady",
  spark: [],
  hours: null,
  ...over,
});

describe("explore query", () => {
  it("round-trips through the URL and leaves defaults out", () => {
    const query = parseQuery({ q: "rust cli", reply: "48", issues: "1", view: "table" });
    expect(query).toMatchObject({
      q: "rust cli",
      reply: 48,
      issues: true,
      view: "table",
    });
    expect(toSearch(query)).toBe("?q=rust+cli&reply=48&issues=1&view=table");
    expect(toSearch(parseQuery({}))).toBe("");
    expect(parseQuery({ sort: "nonsense", reply: "-4", page: "0" })).toMatchObject({
      sort: "reply",
      reply: null,
      page: 1,
    });
  });

  it("goes back to the first page when a filter changes, but not when paging", () => {
    const query = parseQuery({ page: "3" });
    expect(toSearch(query, { lang: "Go" })).toBe("?lang=Go");
    expect(toSearch(query, { page: 4 })).toBe("?page=4");
  });

  it("filters on every field and never lets a missing figure pass a threshold", () => {
    const rows = [
      row("a/fast", { replyHours: 10, mergeRate: 0.9, available: 2 }),
      row("b/slow", { replyHours: 400, mergeRate: 0.3 }),
      row("c/unknown", { replyHours: null, mergeRate: null }),
      row("d/go", { lang: ["Go"], fw: ["gin"], cla: "cla", commits90d: 0 }),
    ];
    const ids = (params: Record<string, string>) =>
      filterRows(rows, parseQuery(params)).map((r) => r.id);
    expect(ids({ reply: "48" })).toEqual(["a/fast", "d/go"]);
    expect(ids({ merge: "0.5" })).toEqual(["a/fast", "d/go"]);
    expect(ids({ issues: "1" })).toEqual(["a/fast"]);
    expect(ids({ lang: "go" })).toEqual(["d/go"]);
    expect(ids({ fw: "gin" })).toEqual(["d/go"]);
    expect(ids({ nocla: "1" })).not.toContain("d/go");
    expect(ids({ active: "1" })).not.toContain("d/go");
    expect(ids({ q: "python slow" })).toEqual(["b/slow"]);
  });

  it("sorts missing figures last in either direction", () => {
    const rows = [
      row("a/none", { replyHours: null, mergeRate: null }),
      row("b/mid", { replyHours: 50, mergeRate: 0.5 }),
      row("c/best", { replyHours: 5, mergeRate: 0.9 }),
    ];
    expect(sortRows(rows, "reply").map((r) => r.id)).toEqual([
      "c/best",
      "b/mid",
      "a/none",
    ]);
    expect(sortRows(rows, "merge").map((r) => r.id)).toEqual([
      "c/best",
      "b/mid",
      "a/none",
    ]);
  });

  it("measures how much of a repository's replies land in the visitor's day", () => {
    const hours = new Array<number>(24).fill(0);
    hours[4] = 9; // 04:00 UTC is 09:30 in India, 21:00 the day before in California
    expect(overlapShare(hours, 330)).toBe(1);
    expect(overlapShare(hours, -420)).toBe(1);
    hours[20] = 9; // 20:00 UTC is 01:30 in India
    expect(overlapShare(hours, 330)).toBe(0.5);
    expect(overlapShare(null, 330)).toBeNull();
    const rows = [row("a/day", { hours }), row("b/unknown")];
    expect(filterRows(rows, parseQuery({ overlap: "1" })).map((r) => r.id)).toEqual([
      "a/day",
    ]);
  });

  it("pages results and counts facets", () => {
    const rows = Array.from({ length: 65 }, (_, i) =>
      row(`o/r${String(i).padStart(2, "0")}`, { lang: i % 2 ? ["Go"] : ["Python", "C"] }),
    );
    const result = explore(rows, parseQuery({ sort: "name", page: "3" }));
    expect(result).toMatchObject({ total: 65, pages: 3, page: 3 });
    expect(result.rows).toHaveLength(5);
    expect(explore(rows, parseQuery({ page: "99" })).page).toBe(3);
    expect(facet(rows, (r) => r.lang).slice(0, 2)).toEqual([
      { value: "C", count: 33 },
      { value: "Python", count: 33 },
    ]);
  });
});

describe("GSoC organisations", () => {
  const org = (slug: string): GsocOrgInfo => ({
    slug,
    name: slug,
    years: [2026],
    website: null,
    tech: [],
    topics: [],
    logo: null,
    tagline: null,
    categories: [],
    ideas: null,
    unmappable: null,
  });

  it("pools repositories weighted by their sample", () => {
    const rows = [
      row("x/big", { gsoc: "x", within7d: 0.5, replyN: 30, mergeRate: 0.4, decided: 30 }),
      row("x/small", { gsoc: "x", within7d: 1, replyN: 10, mergeRate: 1, decided: 10 }),
      row("y/other", { gsoc: "y" }),
    ];
    const stats = orgStats(org("x"), rows);
    expect(stats.repos).toHaveLength(2);
    expect(stats.replyN).toBe(40);
    expect(stats.within7d).toBeCloseTo(0.625);
    expect(stats.mergeRate).toBeCloseTo(0.55);
  });

  it("withholds a figure under five pull requests and ranks that organisation last", () => {
    const rows = [
      row("x/tiny", { gsoc: "x", within7d: 1, replyN: 3 }),
      row("y/solid", { gsoc: "y", within7d: 0.6, replyN: 40 }),
      row("z/best", { gsoc: "z", within7d: 0.9, replyN: 40 }),
    ];
    const ranked = rankOrgs(["x", "y", "z"].map((slug) => orgStats(org(slug), rows)));
    expect(ranked.map((s) => s.org.slug)).toEqual(["z", "y", "x"]);
    expect(ranked[2].within7d).toBeNull();
  });

  it("suggests the fastest repository that has an available starter issue", () => {
    const rows = [
      row("x/fastest", { replyHours: 5 }),
      row("x/with-issues", { replyHours: 30, available: 3 }),
      row("x/unmeasured", { replyHours: null, available: 9 }),
    ];
    expect(startingRepo(rows)?.id).toBe("x/with-issues");
    expect(startingRepo([rows[0], rows[2]])?.id).toBe("x/fastest");
    expect(startingRepo([rows[2]])).toBeNull();
  });
});

describe("GSoC ranking sample", () => {
  const org = (slug: string): GsocOrgInfo => ({
    slug,
    name: slug,
    years: [2026],
    website: null,
    tech: [],
    topics: [],
    logo: null,
    tagline: null,
    categories: [],
    ideas: null,
    unmappable: null,
  });

  it("does not let a perfect record over a handful of pull requests take first place", () => {
    const rows = [
      row("small/a", { gsoc: "small", within7d: 1, replyN: 8 }),
      row("large/a", { gsoc: "large", within7d: 0.9, replyN: 300 }),
      row("mid/a", { gsoc: "mid", within7d: 0.7, replyN: 25 }),
    ];
    const ranked = rankOrgs(
      ["small", "large", "mid"].map((slug) => orgStats(org(slug), rows)),
    );
    expect(ranked.map((s) => s.org.slug)).toEqual(["large", "mid", "small"]);
    // The small organisation still shows its figure; it just has no place.
    expect(ranked[2].within7d).toBe(1);
  });
});

describe("sortRows with small samples", () => {
  it("puts projects measured on enough pull requests first", () => {
    const rows = [
      row("a/lucky", { replyHours: 0.5, replyN: 6, mergeRate: 1, decided: 6 }),
      row("b/solid", { replyHours: 8, replyN: 60, mergeRate: 0.8, decided: 55 }),
      row("c/solid-fast", { replyHours: 4, replyN: 30, mergeRate: 0.7, decided: 25 }),
    ];
    expect(sortRows(rows, "reply").map((r) => r.id)).toEqual([
      "c/solid-fast",
      "b/solid",
      "a/lucky",
    ]);
    expect(sortRows(rows, "merge").map((r) => r.id)).toEqual([
      "b/solid",
      "c/solid-fast",
      "a/lucky",
    ]);
  });
});
