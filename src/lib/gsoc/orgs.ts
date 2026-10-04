import type { IndexRow } from "@/core/published";
import universe from "../../../universe/gsoc.json";

export interface GsocOrgInfo {
  slug: string;
  name: string;
  years: number[];
  website: string | null;
  tech: string[];
  topics: string[];
  logo: string | null;
  tagline: string | null;
  categories: string[];
  /** The organisation's own list of project ideas for the most recent year. */
  ideas: string | null;
  unmappable: string | null;
}

export const GSOC_ORGS = universe as unknown as GsocOrgInfo[];
export const GSOC_YEARS = [...new Set(GSOC_ORGS.flatMap((o) => o.years))].sort(
  (a, b) => b - a,
);

/** Under this many outside pull requests an organisation is listed but not ranked. */
export const MIN_ORG_SAMPLE = 5;
/**
 * Outside pull requests an organisation needs to take a place in the ranking. A
 * perfect record over six pull requests is luck as much as habit, so smaller
 * organisations show their figures but are listed after the ranked ones.
 */
export const RANK_MIN_SAMPLE = 20;

/** Whether an organisation has enough pull requests to be ranked on reply share. */
export const isRanked = (stats: { within7d: number | null; replyN: number }) =>
  stats.within7d !== null && stats.replyN >= RANK_MIN_SAMPLE;

export interface OrgStats {
  org: GsocOrgInfo;
  repos: IndexRow[];
  /** Outside pull requests behind the reply figures, across all repositories. */
  replyN: number;
  within48h: number | null;
  within7d: number | null;
  /** Decided outside pull requests behind the merge rate. */
  decided: number;
  mergeRate: number | null;
  available: number;
  /** The repository a newcomer should open first, by the rule in startingRepo. */
  start: IndexRow | null;
  updatedAt: string | null;
}

/** Pools a per-repository share into one, weighting each repository by its sample. */
function pooled(
  rows: IndexRow[],
  share: (row: IndexRow) => number | null,
  weight: (row: IndexRow) => number,
): { value: number | null; n: number } {
  let total = 0;
  let hits = 0;
  for (const row of rows) {
    const s = share(row);
    if (s === null) continue;
    total += weight(row);
    hits += s * weight(row);
  }
  return { value: total >= MIN_ORG_SAMPLE ? hits / total : null, n: total };
}

/**
 * Where to start in an organisation: the repository with an available starter issue
 * and the fastest first reply. Without starter issues anywhere, the fastest reply alone.
 */
export function startingRepo(rows: IndexRow[]): IndexRow | null {
  const measured = rows.filter((r) => r.replyHours !== null);
  const pool = measured.some((r) => r.available > 0)
    ? measured.filter((r) => r.available > 0)
    : measured;
  return [...pool].sort((a, b) => a.replyHours! - b.replyHours!)[0] ?? null;
}

export function orgStats(org: GsocOrgInfo, rows: readonly IndexRow[]): OrgStats {
  const repos = rows.filter((r) => r.gsoc === org.slug);
  const reply7 = pooled(
    repos,
    (r) => r.within7d,
    (r) => r.replyN,
  );
  const reply48 = pooled(
    repos,
    (r) => r.within48h,
    (r) => r.replyN,
  );
  const merge = pooled(
    repos,
    (r) => r.mergeRate,
    (r) => r.decided,
  );
  return {
    org,
    repos: [...repos].sort((a, b) => b.stars - a.stars),
    replyN: reply7.n,
    within48h: reply48.value,
    within7d: reply7.value,
    decided: merge.n,
    mergeRate: merge.value,
    available: repos.reduce((sum, r) => sum + r.available, 0),
    start: startingRepo(repos),
    updatedAt: repos.map((r) => r.updatedAt).sort()[0] ?? null,
  };
}

export const ORG_SORTS = {
  reply: "Replies within 7 days",
  merge: "Outside PRs merged",
  issues: "Available starter issues",
  name: "Name",
} as const;
export type OrgSort = keyof typeof ORG_SORTS;

/**
 * The ranking rule, in full: share of outside pull requests answered by a person
 * within 7 days, highest first; ties go to the higher outside merge rate, then to the
 * larger sample. Organisations with fewer than 20 outside pull requests come last,
 * unranked, most pull requests first.
 */
export function rankOrgs(stats: OrgStats[], sort: OrgSort = "reply"): OrgStats[] {
  const value = (s: OrgStats): number | null =>
    sort === "reply"
      ? isRanked(s)
        ? s.within7d
        : null
      : sort === "merge"
        ? s.decided >= RANK_MIN_SAMPLE
          ? s.mergeRate
          : null
        : s.available;
  return [...stats].sort((a, b) => {
    if (sort === "name") return a.org.name.localeCompare(b.org.name);
    const x = value(a);
    const y = value(b);
    if (x === null || y === null) {
      if (x === y) return b.replyN - a.replyN || a.org.name.localeCompare(b.org.name);
      return x === null ? 1 : -1;
    }
    return (
      y - x ||
      (b.mergeRate ?? -1) - (a.mergeRate ?? -1) ||
      b.replyN - a.replyN ||
      a.org.name.localeCompare(b.org.name)
    );
  });
}

export function allOrgStats(rows: readonly IndexRow[]): OrgStats[] {
  return GSOC_ORGS.map((org) => orgStats(org, rows));
}
