import { WINDOWS, type Collection, type Commit, type WindowDays } from "@/types";
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
  distribution: { name: string; login: string | null; commits: number; share: number }[];
}

export interface ContributorAnalysis {
  available: boolean;
  windows: Record<WindowDays, Concentration & { covered: boolean }>;
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
  const counts = new Map<string, { login: string | null; commits: number }>();
  for (const commit of human) {
    const entry = counts.get(commit.author) ?? { login: commit.login, commits: 0 };
    entry.commits += 1;
    counts.set(commit.author, entry);
  }
  const ranked = [...counts.entries()]
    .map(([name, entry]) => ({ name, ...entry }))
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
  return {
    available: ok,
    windows,
  };
}
