import {
  WINDOWS,
  type Collection,
  type Commit,
  type Contributor,
  type WindowDays,
} from "@/types";
import { inWindow, isCovered, round } from "./time";

export interface Concentration {
  totalCommits: number;
  /** Commits by accounts GitHub marks as bots; excluded from every share below. */
  botCommits: number;
  humanCommits: number;
  contributors: number;
  topShare: number | null;
  top3Share: number | null;
  /** Smallest number of contributors whose commits add up to at least half of the total. */
  halfCount: number | null;
  distribution: { name: string; commits: number; share: number }[];
}

export interface ContributorAnalysis {
  available: boolean;
  windows: Record<WindowDays, Concentration & { covered: boolean }>;
  allTime: {
    available: boolean;
    note: string | null;
    listed: number;
    complete: boolean;
    topShare: number | null;
  };
}

/**
 * Concentration of commit authorship.
 *
 *   share(author) = commits by author / human-authored commits in the window
 *
 * Bot accounts are excluded so automated dependency updates do not read as a dominant
 * contributor. Commits not linked to a GitHub account are grouped by git author name.
 */
export function calculateContributorConcentration(commits: Commit[]): Concentration {
  const human = commits.filter((c) => !c.isBot);
  const counts = new Map<string, number>();
  for (const commit of human) {
    counts.set(commit.author, (counts.get(commit.author) ?? 0) + 1);
  }
  const ranked = [...counts.entries()]
    .map(([name, n]) => ({ name, commits: n }))
    .sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name));

  const total = human.length;
  const pct = (n: number) => round((n / total) * 100);
  let halfCount: number | null = null;
  if (total > 0) {
    let running = 0;
    halfCount = 0;
    for (const entry of ranked) {
      running += entry.commits;
      halfCount += 1;
      if (running * 2 >= total) break;
    }
  }

  return {
    totalCommits: commits.length,
    botCommits: commits.length - total,
    humanCommits: total,
    contributors: ranked.length,
    topShare: total > 0 ? pct(ranked[0].commits) : null,
    top3Share:
      total > 0 ? pct(ranked.slice(0, 3).reduce((s, e) => s + e.commits, 0)) : null,
    halfCount,
    distribution: ranked.slice(0, 8).map((e) => ({ ...e, share: pct(e.commits) })),
  };
}

export function calculateContributors(
  commits: Collection<Commit>,
  contributors: Collection<Contributor>,
  now: Date,
): ContributorAnalysis {
  const ok = commits.status === "ok";
  const windows = {} as ContributorAnalysis["windows"];
  for (const days of WINDOWS) {
    windows[days] = {
      covered: ok && isCovered(commits.coveredSince, now, days),
      ...calculateContributorConcentration(
        commits.items.filter((c) => inWindow(c.date, now, days)),
      ),
    };
  }

  const humans = contributors.items.filter((c) => !c.isBot);
  const total = humans.reduce((sum, c) => sum + c.contributions, 0);
  const top = Math.max(0, ...humans.map((c) => c.contributions));
  return {
    available: ok,
    windows,
    allTime: {
      available: contributors.status === "ok" && humans.length > 0,
      note: contributors.note ?? null,
      listed: humans.length,
      complete: contributors.complete,
      topShare: total > 0 ? round((top / total) * 100) : null,
    },
  };
}
