import { mergeOutcome, responseTiming } from "./metrics";
import type { PullSummary, RepoState } from "./schema";

/**
 * The months when Google Summer of Code applicants are contributing: organisations
 * are announced in late February and applications close in early April, so a
 * newcomer's pull requests land from February to April. Figures for these months
 * answer the question an applicant actually has: how was it last season?
 */
export const SEASON = {
  id: "gsoc-2026",
  year: 2026,
  /** Short enough for a toggle. */
  label: "Application season 2026",
  /** First day, inclusive. */
  from: "2026-02-01T00:00:00.000Z",
  /** First day after the window. */
  to: "2026-05-01T00:00:00.000Z",
  dates: "1 Feb to 30 Apr 2026",
} as const;

export interface SeasonFigures {
  /** Median first human reply, in hours; null under the minimum sample. */
  replyHours: number | null;
  within48h: number | null;
  within7d: number | null;
  /** Outside pull requests opened in the window. */
  replyN: number;
  mergeRate: number | null;
  decided: number;
}

/** A cut-short first read holds at least 60 pages of 5; fewer means it ran to the end. */
const SMALL_HISTORY = 300;

const round = (value: number | null, digits: number) =>
  value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits;

/**
 * Whether the stored history holds every pull request from the window. The first read
 * walks pull requests newest-updated first and can stop early on a very busy
 * repository; everything updated after the point it reached is present, and a
 * pull request opened in the window was updated no earlier than it was opened. So
 * the history is complete for the window when the walk reached past its start, or
 * when it is too small to have been cut short at all.
 */
export function seasonCovered(
  state: Pick<RepoState, "pulls" | "coveredSince">,
  from: string = SEASON.from,
): boolean {
  if (state.coveredSince > from) return false;
  if (state.pulls.length < SMALL_HISTORY) return true;
  let oldest = state.pulls[0].updatedAt;
  for (const pull of state.pulls) if (pull.updatedAt < oldest) oldest = pull.updatedAt;
  return oldest <= from;
}

/** Outside pull requests opened in the window. */
export function seasonPulls(
  pulls: readonly PullSummary[],
  window: { from: string; to: string } = SEASON,
): PullSummary[] {
  return pulls.filter(
    (p) => p.cls === "outside" && p.createdAt >= window.from && p.createdAt < window.to,
  );
}

/**
 * The window's figures, by the same rules as the rolling ones, or null when the
 * stored history cannot vouch for the window.
 */
export function computeSeason(
  state: Pick<RepoState, "pulls" | "coveredSince">,
  now: Date,
  window: { from: string; to: string } = SEASON,
): SeasonFigures | null {
  if (!seasonCovered(state, window.from)) return null;
  const pulls = seasonPulls(state.pulls, window);
  const timing = responseTiming(pulls, now.getTime());
  const merge = mergeOutcome(pulls);
  return {
    replyHours: round(timing.medianHours, 1),
    within48h: round(timing.within48h, 4),
    within7d: round(timing.within7d, 4),
    replyN: timing.n,
    mergeRate: round(merge.mergeRate, 4),
    decided: merge.merged + merge.closedUnmerged,
  };
}

/** One repository's remembered figures, with the history read they came from. */
export interface SeasonEntry {
  syncedAt: string;
  figures: SeasonFigures | null;
}

/**
 * The published seasons file. Stored history only covers a year, so the window's
 * figures are computed while it is still in reach and kept here after it is not.
 */
export interface SeasonsFile {
  v: number;
  season: typeof SEASON;
  generatedAt: string;
  repos: Record<string, SeasonEntry>;
}

/**
 * What to remember after a fresh read of a repository. New figures replace old ones,
 * because later refreshes learn how the window's pull requests ended. A read that can
 * no longer see the window (its months have aged out of the stored year) keeps what
 * was remembered rather than forgetting it.
 */
export function rememberSeason(
  previous: SeasonEntry | undefined,
  syncedAt: string,
  figures: SeasonFigures | null,
): SeasonEntry {
  if (figures === null && previous?.figures) return { ...previous, syncedAt };
  return { syncedAt, figures };
}
