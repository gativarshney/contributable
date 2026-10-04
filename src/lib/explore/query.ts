import type { IndexRow } from "@/core/published";

export const SORTS = {
  reply: "Fastest first reply",
  merge: "Highest outside merge rate",
  issues: "Most available starter issues",
  stars: "Most stars",
  recent: "Most recently active",
  name: "Name",
} as const;
export type SortKey = keyof typeof SORTS;

/** Outside pull requests a project needs for its figures to be more than luck. */
export const SOLID_SAMPLE = 20;

export const PAGE_SIZE = 30;
/** India Standard Time, the default zone for the "replies while I am awake" filter. */
export const DEFAULT_TZ_MINUTES = 330;
/** Local hours counted as "awake": 08:00 up to midnight. */
const AWAKE_FROM = 8;
const AWAKE_TO = 24;
/** Share of replies that must land in those hours for a repository to count as overlapping. */
export const OVERLAP_SHARE = 0.5;

export interface ExploreQuery {
  q: string;
  lang: string | null;
  fw: string | null;
  topic: string | null;
  program: "gsoc" | null;
  year: number | null;
  /** Median first reply at most this many hours. */
  reply: number | null;
  /** Outside merge rate at least this share, 0 to 1. */
  merge: number | null;
  /** Only repositories with at least one available starter issue. */
  issues: boolean;
  /** Only repositories with commits in the last 90 days. */
  active: boolean;
  /** Hide repositories that need a CLA or DCO sign-off. */
  noCla: boolean;
  /** Only repositories whose replies mostly arrive during the visitor's day. */
  overlap: boolean;
  tz: number;
  sort: SortKey;
  view: "cards" | "table";
  page: number;
}

type Params = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
const numberIn = (raw: string, min: number, max: number): number | null => {
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
};

export function parseQuery(params: Params): ExploreQuery {
  const sort = one(params.sort);
  return {
    q: one(params.q).slice(0, 80),
    lang: one(params.lang) || null,
    fw: one(params.fw) || null,
    topic: one(params.topic) || null,
    program: one(params.program) === "gsoc" ? "gsoc" : null,
    year: numberIn(one(params.year), 2000, 2100),
    reply: numberIn(one(params.reply), 1, 24 * 365),
    merge: numberIn(one(params.merge), 0, 1),
    issues: one(params.issues) === "1",
    active: one(params.active) === "1",
    noCla: one(params.nocla) === "1",
    overlap: one(params.overlap) === "1",
    tz: numberIn(one(params.tz), -720, 840) ?? DEFAULT_TZ_MINUTES,
    sort: sort in SORTS ? (sort as SortKey) : "reply",
    view: one(params.view) === "table" ? "table" : "cards",
    page: Math.max(1, Math.floor(numberIn(one(params.page), 1, 10_000) ?? 1)),
  };
}

/** The query as URL parameters, leaving out everything that is at its default. */
export function toSearch(
  query: ExploreQuery,
  change: Partial<ExploreQuery> = {},
): string {
  const next = { ...query, ...change };
  // Any change other than the page itself starts again from the first page.
  if (!("page" in change)) next.page = 1;
  const out = new URLSearchParams();
  if (next.q) out.set("q", next.q);
  if (next.lang) out.set("lang", next.lang);
  if (next.fw) out.set("fw", next.fw);
  if (next.topic) out.set("topic", next.topic);
  if (next.program) out.set("program", next.program);
  if (next.year) out.set("year", String(next.year));
  if (next.reply) out.set("reply", String(next.reply));
  if (next.merge) out.set("merge", String(next.merge));
  if (next.issues) out.set("issues", "1");
  if (next.active) out.set("active", "1");
  if (next.noCla) out.set("nocla", "1");
  if (next.overlap) out.set("overlap", "1");
  if (next.tz !== DEFAULT_TZ_MINUTES) out.set("tz", String(next.tz));
  if (next.sort !== "reply") out.set("sort", next.sort);
  if (next.view !== "cards") out.set("view", next.view);
  if (next.page > 1) out.set("page", String(next.page));
  const text = out.toString();
  return text ? `?${text}` : "";
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Words are matched against the name, description, languages, frameworks and topics. */
export function matchesText(row: IndexRow, q: string): boolean {
  const words = q
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [row.id, row.d, ...row.lang, ...row.fw, ...row.topics, row.gsoc ?? ""]
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/**
 * Share of a repository's replies that fall in the visitor's waking hours. The profile
 * is by hour of day in UTC, so it is shifted by the visitor's offset first.
 */
export function overlapShare(hours: number[] | null, tzMinutes: number): number | null {
  if (hours === null) return null;
  const total = hours.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  let awake = 0;
  hours.forEach((count, utcHour) => {
    const local = (((utcHour + tzMinutes / 60) % 24) + 24) % 24;
    if (local >= AWAKE_FROM && local < AWAKE_TO) awake += count;
  });
  return awake / total;
}

export function filterRows(rows: readonly IndexRow[], query: ExploreQuery): IndexRow[] {
  return rows.filter((row) => {
    if (!matchesText(row, query.q)) return false;
    if (query.lang && !row.lang.some((l) => same(l, query.lang!))) return false;
    if (query.fw && !row.fw.some((f) => same(f, query.fw!))) return false;
    if (query.topic && !row.topics.some((t) => same(t, query.topic!))) return false;
    if (query.program === "gsoc" && row.gsoc === null) return false;
    if (query.year && !row.years.includes(query.year)) return false;
    if (query.reply && !(row.replyHours !== null && row.replyHours <= query.reply))
      return false;
    if (query.merge && !(row.mergeRate !== null && row.mergeRate >= query.merge))
      return false;
    if (query.issues && row.available === 0) return false;
    if (query.active && !(row.commits90d !== null && row.commits90d > 0)) return false;
    if (query.noCla && (row.cla === "cla" || row.cla === "dco")) return false;
    if (query.overlap) {
      const share = overlapShare(row.hours, query.tz);
      if (share === null || share < OVERLAP_SHARE) return false;
    }
    return true;
  });
}

/** A missing value always sorts last, whichever direction the column runs. */
function by(
  pick: (row: IndexRow) => number | null,
  direction: "asc" | "desc",
): (a: IndexRow, b: IndexRow) => number {
  return (a, b) => {
    const x = pick(a);
    const y = pick(b);
    if (x === null || y === null) {
      if (x === y) return a.id.localeCompare(b.id);
      return x === null ? 1 : -1;
    }
    if (x === y) return a.id.localeCompare(b.id);
    return direction === "asc" ? x - y : y - x;
  };
}

/**
 * Projects whose figure rests on at least SOLID_SAMPLE pull requests come first, so a
 * perfect record over six does not outrank a strong one over sixty.
 */
function wellMeasuredFirst(
  sample: (row: IndexRow) => number,
  then: (a: IndexRow, b: IndexRow) => number,
): (a: IndexRow, b: IndexRow) => number {
  return (a, b) =>
    Number(sample(b) >= SOLID_SAMPLE) - Number(sample(a) >= SOLID_SAMPLE) || then(a, b);
}

const COMPARATORS: Record<SortKey, (a: IndexRow, b: IndexRow) => number> = {
  reply: wellMeasuredFirst(
    (r) => r.replyN,
    by((r) => r.replyHours, "asc"),
  ),
  merge: wellMeasuredFirst(
    (r) => r.decided,
    by((r) => r.mergeRate, "desc"),
  ),
  issues: by((r) => r.available, "desc"),
  stars: by((r) => r.stars, "desc"),
  recent: by((r) => (r.pushedAt ? Date.parse(r.pushedAt) : null), "desc"),
  name: (a, b) => a.id.localeCompare(b.id),
};

export function sortRows(rows: readonly IndexRow[], sort: SortKey): IndexRow[] {
  return [...rows].sort(COMPARATORS[sort]);
}

export interface Facet {
  value: string;
  count: number;
}

/** The most common values of a list field, for the filter menus. */
export function facet(
  rows: readonly IndexRow[],
  pick: (row: IndexRow) => readonly string[],
  limit = 40,
): Facet[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const value of pick(row)) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}

export function explore(rows: readonly IndexRow[], query: ExploreQuery) {
  const matched = sortRows(filterRows(rows, query), query.sort);
  const pages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  return {
    total: matched.length,
    pages,
    page,
    rows: matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}
