import {
  WINDOWS,
  type Collection,
  type CommunityFiles,
  type IssueItem,
  type StarterIssue,
  type ThreadComment,
  type WindowDays,
} from "@/types";
import {
  daysBetween,
  inWindow,
  isCovered,
  median,
  observedDays,
  round,
  wholeDaysSince,
} from "./time";

export interface ContributingWindow {
  /** Pull request figures are complete for this window. */
  covered: boolean;
  /** Pull requests opened by people outside the team (bots excluded). */
  communityOpened: number;
  /** All human-authored pull requests opened, for comparison. */
  humanOpened: number;
  communityMerged: number;
  communityClosedUnmerged: number;
  /** merged / (merged + closed unmerged), 0-100. Null when none were closed. */
  mergeShare: number | null;
  medianDaysToMerge: number | null;

  /** Response figures are complete for this window (needs the comment list too). */
  responseCovered: boolean;
  /** Issues and pull requests opened by community authors. */
  threads: number;
  /** Of those, how many received a reply from another person, or were merged. */
  answered: number;
  medianHoursToResponse: number | null;
  /** Community pull requests opened in the window that are still open. */
  communityStillOpen: number;
  /** How quickly each community thread opened in the window first heard back. */
  replies: ReplyBuckets;
  /** Threads opened at least 48 hours ago: the ones that have had a fair chance. */
  matureThreads: number;
  /** Of those, how many were replied to, merged or closed. */
  matureHandled: number;
}

/** A window whose length was chosen by what the data covers; `days` can be a fraction. */
export type ObservedWindow = ContributingWindow & { days: number };

export interface ReplyBuckets {
  withinDay: number;
  withinWeek: number;
  later: number;
  /** Closed with no reply we can see, for example after an approving review. */
  closedQuietly: number;
  /** Still open with no reply. */
  waiting: number;
}

export interface CommunityFile {
  key: keyof CommunityFiles;
  label: string;
  url: string | null;
}

/** A team member, ranked by how much they reply to people outside the team. */
export interface Responder {
  login: string;
  /** Comments left on community-authored issues and pull requests. */
  replies: number;
  /** Distinct community threads they replied on. */
  threads: number;
}

export interface ContributingAnalysis {
  available: boolean;
  windows: Record<WindowDays, ContributingWindow>;
  /**
   * Pull request figures for the longest period the data fully covers: 90, 30 or 7 days,
   * or less on repositories too busy to read a full week of. Null when nothing is covered.
   */
  observed: ObservedWindow | null;
  /** The same for reply figures, which also depend on how far back comments were read. */
  observedReplies: ObservedWindow | null;
  starter: {
    available: boolean;
    total: number;
    /** False when more than 100 issues carry a starter label. */
    complete: boolean;
    unassigned: number;
    medianAgeDays: number | null;
    /** Unassigned starter issues, "good first issue" before "help wanted". */
    issues: StarterIssue[];
  };
  /** Null when GitHub did not return a community profile. */
  files: CommunityFile[] | null;
  /** Team members who replied to community threads in the observed period, busiest first. */
  responders: Responder[];
  /**
   * When team members comment: 336 half-hour slots across a UTC week, Sunday 00:00 first.
   * Half hours let the browser shift the pattern into any local time zone.
   */
  rhythm: { total: number; slots: number[] };
  /** Labels on issues and pull requests opened in the trailing 90 days, most used first. */
  labels: { name: string; count: number }[];
}

const FILE_LABELS: [keyof CommunityFiles, string][] = [
  ["readme", "README"],
  ["contributing", "Contributing guide"],
  ["codeOfConduct", "Code of conduct"],
  ["license", "License"],
  ["issueTemplate", "Issue templates"],
  ["pullRequestTemplate", "Pull request template"],
];

export const SLOTS_PER_WEEK = 7 * 48;

/** Index of the half-hour slot a timestamp falls in, counted from Sunday 00:00 UTC. */
export function weekSlot(iso: string): number {
  const date = new Date(iso);
  return (
    date.getUTCDay() * 48 + date.getUTCHours() * 2 + (date.getUTCMinutes() >= 30 ? 1 : 0)
  );
}

/**
 * When a community-authored thread first heard back from a person.
 *
 * A response is the earliest conversation comment by a human other than the author.
 * A merge also counts for pull requests: community authors cannot merge their own work,
 * so a merge is an action by someone on the team. Bot comments never count.
 */
export function firstResponseAt(
  thread: IssueItem,
  comments: ThreadComment[] | undefined,
): string | null {
  let first: string | null = null;
  for (const comment of comments ?? []) {
    if (comment.association === "bot" || comment.author === null) continue;
    if (comment.author === thread.author || comment.createdAt < thread.createdAt)
      continue;
    if (first === null || comment.createdAt < first) first = comment.createdAt;
  }
  if (thread.mergedAt && (first === null || thread.mergedAt < first))
    first = thread.mergedAt;
  return first;
}

export function calculateContributingSignals(
  issues: Collection<IssueItem>,
  comments: Collection<ThreadComment>,
  starterIssues: Collection<StarterIssue>,
  community: CommunityFiles | null,
  now: Date,
): ContributingAnalysis {
  const ok = issues.status === "ok";
  const byThread = new Map<number, ThreadComment[]>();
  for (const comment of comments.items) {
    const list = byThread.get(comment.issueNumber);
    if (list) list.push(comment);
    else byThread.set(comment.issueNumber, [comment]);
  }

  const pulls = issues.items.filter((i) => i.isPullRequest);
  const communityThreads = issues.items.filter((i) => i.association === "community");
  const windows = {} as Record<WindowDays, ContributingWindow>;

  const windowFor = (days: number): ContributingWindow => {
    const opened = pulls.filter((p) => inWindow(p.createdAt, now, days));
    const fromCommunity = pulls.filter((p) => p.association === "community");
    const merged = fromCommunity.filter((p) => inWindow(p.mergedAt, now, days));
    const closedUnmerged = fromCommunity.filter(
      (p) => !p.mergedAt && inWindow(p.closedAt, now, days),
    );
    const closed = merged.length + closedUnmerged.length;
    const mergeDays = median(merged.map((p) => daysBetween(p.createdAt, p.mergedAt!)));

    const threads = communityThreads.filter((t) => inWindow(t.createdAt, now, days));
    const waits = threads.map((t) => {
      const at = firstResponseAt(t, byThread.get(t.number));
      return at ? daysBetween(t.createdAt, at) * 24 : null;
    });
    const responseHours = waits.filter((h): h is number => h !== null);
    const medianHours = median(responseHours);
    const covered = ok && isCovered(issues.coveredSince, now, days);

    const replies: ReplyBuckets = {
      withinDay: 0,
      withinWeek: 0,
      later: 0,
      closedQuietly: 0,
      waiting: 0,
    };
    let matureThreads = 0;
    let matureHandled = 0;
    threads.forEach((thread, i) => {
      const hours = waits[i];
      if (hours === null) replies[thread.closedAt ? "closedQuietly" : "waiting"] += 1;
      else if (hours <= 24) replies.withinDay += 1;
      else if (hours <= 24 * 7) replies.withinWeek += 1;
      else replies.later += 1;
      if (daysBetween(thread.createdAt, now) >= 2) {
        matureThreads += 1;
        if (hours !== null || thread.closedAt) matureHandled += 1;
      }
    });

    return {
      covered,
      communityOpened: opened.filter((p) => p.association === "community").length,
      humanOpened: opened.filter((p) => p.association !== "bot").length,
      communityMerged: merged.length,
      communityClosedUnmerged: closedUnmerged.length,
      mergeShare: closed > 0 ? round((merged.length / closed) * 100, 0) : null,
      medianDaysToMerge: mergeDays === null ? null : round(mergeDays),
      responseCovered:
        covered &&
        comments.status === "ok" &&
        isCovered(comments.coveredSince, now, days),
      threads: threads.length,
      answered: responseHours.length,
      medianHoursToResponse: medianHours === null ? null : round(medianHours),
      communityStillOpen: opened.filter(
        (p) => p.association === "community" && !p.closedAt,
      ).length,
      replies,
      matureThreads,
      matureHandled,
    };
  };
  for (const days of WINDOWS) windows[days] = windowFor(days);

  // Very busy repositories exceed the reading limit before a full week is covered.
  // Rather than report nothing, report the period the data does cover, and say so.
  const pullDays = ok ? observedDays(issues.coveredSince, now) : null;
  const replyCoverage =
    issues.coveredSince && comments.coveredSince && comments.status === "ok"
      ? [issues.coveredSince, comments.coveredSince].sort()[1]
      : null;
  const replyDays = ok ? observedDays(replyCoverage, now) : null;

  // Who on the team talks to outside contributors, and when the team is around.
  const communityNumbers = new Set(communityThreads.map((t) => t.number));
  const replies = new Map<string, { replies: number; threads: Set<number> }>();
  const slots = new Array<number>(SLOTS_PER_WEEK).fill(0);
  let teamComments = 0;
  for (const comment of comments.items) {
    if (comment.association !== "team" || comment.author === null) continue;
    slots[weekSlot(comment.createdAt)] += 1;
    teamComments += 1;
    if (!communityNumbers.has(comment.issueNumber)) continue;
    const entry = replies.get(comment.author) ?? { replies: 0, threads: new Set() };
    entry.replies += 1;
    entry.threads.add(comment.issueNumber);
    replies.set(comment.author, entry);
  }
  const responders = [...replies.entries()]
    .map(([login, r]) => ({ login, replies: r.replies, threads: r.threads.size }))
    .sort(
      (a, b) =>
        b.threads - a.threads || b.replies - a.replies || a.login.localeCompare(b.login),
    )
    .slice(0, 6);

  const labelCounts = new Map<string, number>();
  for (const item of issues.items) {
    if (!inWindow(item.createdAt, now, 90)) continue;
    for (const label of item.labels) {
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    }
  }
  const labels = [...labelCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 10);

  const unassigned = starterIssues.items.filter((issue) => !issue.assigned);
  const age = median(
    starterIssues.items.map((issue) => wholeDaysSince(issue.createdAt, now)),
  );

  return {
    available: ok,
    windows,
    observed: pullDays === null ? null : { days: pullDays, ...windowFor(pullDays) },
    observedReplies:
      replyDays === null ? null : { days: replyDays, ...windowFor(replyDays) },
    starter: {
      available: starterIssues.status === "ok",
      total: starterIssues.items.length,
      complete: starterIssues.complete,
      unassigned: unassigned.length,
      medianAgeDays: age === null ? null : Math.round(age),
      issues: unassigned.slice(0, 5),
    },
    files: community
      ? FILE_LABELS.map(([key, label]) => ({ key, label, url: community[key] }))
      : null,
    responders,
    rhythm: { total: teamComments, slots },
    labels,
  };
}

export interface LanguageShare {
  name: string;
  /** Share of the repository's code by bytes, 0-100. */
  share: number;
}

/** The repository's languages by share of bytes; small ones are folded into "Other". */
export function calculateStack(
  languages: Record<string, number> | null,
): LanguageShare[] {
  if (!languages) return [];
  const entries = Object.entries(languages).filter(([, bytes]) => bytes > 0);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total === 0) return [];
  const ranked = entries
    .map(([name, bytes]) => ({ name, share: (bytes / total) * 100 }))
    .sort((a, b) => b.share - a.share);
  const top = ranked.slice(0, 5).filter((l) => l.share >= 1);
  const other = 100 - top.reduce((sum, l) => sum + l.share, 0);
  const result = top.map((l) => ({ name: l.name, share: round(l.share) }));
  if (other >= 0.5) result.push({ name: "Other", share: round(other) });
  return result;
}
