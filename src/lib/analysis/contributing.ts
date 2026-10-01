import {
  WINDOWS,
  type Collection,
  type CommunityFiles,
  type IssueItem,
  type StarterIssue,
  type ThreadComment,
  type WindowDays,
} from "@/types";
import { daysBetween, inWindow, isCovered, median, round, wholeDaysSince } from "./time";

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
}

export interface CommunityFile {
  key: keyof CommunityFiles;
  label: string;
  url: string | null;
}

export interface ContributingAnalysis {
  available: boolean;
  windows: Record<WindowDays, ContributingWindow>;
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
}

const FILE_LABELS: [keyof CommunityFiles, string][] = [
  ["readme", "README"],
  ["contributing", "Contributing guide"],
  ["codeOfConduct", "Code of conduct"],
  ["license", "License"],
  ["issueTemplate", "Issue templates"],
  ["pullRequestTemplate", "Pull request template"],
];

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
    if (comment.isBot || comment.author === null || comment.author === thread.author)
      continue;
    if (comment.createdAt < thread.createdAt) continue;
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

  for (const days of WINDOWS) {
    const opened = pulls.filter((p) => inWindow(p.createdAt, now, days));
    const community = pulls.filter((p) => p.association === "community");
    const merged = community.filter((p) => inWindow(p.mergedAt, now, days));
    const closedUnmerged = community.filter(
      (p) => !p.mergedAt && inWindow(p.closedAt, now, days),
    );
    const closed = merged.length + closedUnmerged.length;
    const mergeDays = median(merged.map((p) => daysBetween(p.createdAt, p.mergedAt!)));

    const threads = communityThreads.filter((t) => inWindow(t.createdAt, now, days));
    const responseHours = threads
      .map((t) => firstResponseAt(t, byThread.get(t.number)))
      .map((at, i) => (at ? daysBetween(threads[i].createdAt, at) * 24 : null))
      .filter((h): h is number => h !== null);
    const medianHours = median(responseHours);
    const covered = ok && isCovered(issues.coveredSince, now, days);

    windows[days] = {
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
    };
  }

  const unassigned = starterIssues.items.filter((issue) => !issue.assigned);
  const age = median(
    starterIssues.items.map((issue) => wholeDaysSince(issue.createdAt, now)),
  );

  return {
    available: ok,
    windows,
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
  };
}
