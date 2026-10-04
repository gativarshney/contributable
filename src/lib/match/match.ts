import type { IndexRow } from "@/core/published";
import { DEFAULT_TZ_MINUTES, overlapShare } from "@/lib/explore/query";
import { duration, inTen, percent } from "@/lib/format";

export const LEVELS = {
  beginner: "New to open source",
  some: "A few pull requests merged",
  experienced: "Regular contributor",
} as const;
export const GOALS = {
  "first-pr": "Get a first pull request merged",
  gsoc: "Prepare for Google Summer of Code",
  learn: "Learn a codebase in my stack",
} as const;
export type Level = keyof typeof LEVELS;
export type Goal = keyof typeof GOALS;

export interface MatchInput {
  stack: string[];
  level: Level;
  hours: number;
  goal: Goal;
  tz: number;
}

export interface Match {
  row: IndexRow;
  /** Stack terms the repository matched, as written in its own data. */
  matched: string[];
  reasons: string[];
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export function parseMatch(params: Params): MatchInput {
  const level = one(params.level);
  const goal = one(params.goal);
  const tz = Number(one(params.tz));
  const hours = Number(one(params.hours));
  return {
    stack: [
      ...new Set(
        one(params.stack)
          .toLowerCase()
          .split(/[,\n]+/)
          .map((term) => term.trim())
          .filter(Boolean),
      ),
    ].slice(0, 12),
    level: level in LEVELS ? (level as Level) : "beginner",
    hours: Number.isFinite(hours) && hours >= 1 && hours <= 80 ? Math.round(hours) : 6,
    goal: goal in GOALS ? (goal as Goal) : "first-pr",
    tz:
      one(params.tz) !== "" && Number.isFinite(tz) && tz >= -720 && tz <= 840
        ? tz
        : DEFAULT_TZ_MINUTES,
  };
}

/** A week is enough to wait when you only have a few hours for the project. */
const SHORT_ON_TIME_HOURS = 5;
const SLOW_MERGE_HOURS = 30 * 24;

/**
 * The rule, in order:
 *  1. Keep repositories that use at least one thing in your stack.
 *  2. Keep the ones that fit your goal and level (listed in `fits`).
 *  3. Projects measured on 20 or more outside pull requests come before smaller ones.
 *  4. Order by: share of outside pull requests answered within 48 hours, then outside
 *     merge rate, then available starter issues. Repositories without enough data to
 *     show a figure come last.
 */
/** Outside pull requests a project needs for its figures to be more than luck. */
export const SOLID_SAMPLE = 20;

export function matchProjects(rows: readonly IndexRow[], input: MatchInput): Match[] {
  if (input.stack.length === 0) return [];
  const out: Match[] = [];
  for (const row of rows) {
    const terms = [...row.lang, ...row.fw, ...row.topics];
    // "Python" the language and "python" the topic are one match, not two.
    const seen = new Set<string>();
    const matched = terms.filter((term) => {
      const lower = term.toLowerCase();
      if (!input.stack.includes(lower) || seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
    if (matched.length === 0 || !fits(row, input)) continue;
    out.push({ row, matched, reasons: reasons(row, input, matched) });
  }
  const key = (v: number | null) => v ?? -1;
  return out.sort(
    (a, b) =>
      Number(b.row.replyN >= SOLID_SAMPLE) - Number(a.row.replyN >= SOLID_SAMPLE) ||
      key(b.row.within48h) - key(a.row.within48h) ||
      key(b.row.mergeRate) - key(a.row.mergeRate) ||
      b.row.available - a.row.available ||
      b.matched.length - a.matched.length ||
      a.row.id.localeCompare(b.row.id),
  );
}

export function fits(row: IndexRow, input: MatchInput): boolean {
  // Somebody must be home.
  if (row.trend === "went-quiet" || !row.commits90d) return false;
  if (input.goal === "gsoc" && row.gsoc === null) return false;
  if (input.goal === "first-pr" && row.available === 0 && row.mergeRate === null)
    return false;
  if (input.level === "beginner") {
    // A newcomer needs written guidance and an answer within a week.
    if (!row.guide) return false;
    if (row.replyHours !== null && row.replyHours > 168) return false;
  }
  if (
    input.hours <= SHORT_ON_TIME_HOURS &&
    row.mergeHours !== null &&
    row.mergeHours > SLOW_MERGE_HOURS
  )
    return false;
  return true;
}

function reasons(row: IndexRow, input: MatchInput, matched: string[]): string[] {
  const list: string[] = [`Uses ${matched.slice(0, 3).join(", ")}.`];
  if (row.within48h !== null) {
    list.push(
      `${percent(row.within48h)} of outside PRs get a reply within 48 hours (${row.replyN} PRs, median ${duration(row.replyHours)}).`,
    );
  } else {
    list.push(`Too few outside PRs (${row.replyN}) to measure reply time.`);
  }
  if (row.mergeRate !== null) {
    list.push(`${inTen(row.mergeRate)} outside PRs are merged (${row.decided} decided).`);
  }
  if (row.available > 0) {
    list.push(
      `${row.available} starter ${row.available === 1 ? "issue is" : "issues are"} available now.`,
    );
  }
  if (input.goal === "gsoc" && row.years.length > 0) {
    list.push(`Its organisation took part in GSoC ${row.years.join(", ")}.`);
  }
  const overlap = overlapShare(row.hours, input.tz);
  if (overlap !== null) {
    list.push(
      `${percent(overlap)} of replies arrive between 08:00 and midnight your time.`,
    );
  }
  if (row.cla === "cla") list.push("Needs a signed contributor licence agreement.");
  if (row.cla === "dco") list.push("Commits need a DCO sign-off (git commit -s).");
  return list;
}
