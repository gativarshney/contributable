import type { Analysis } from "@/lib/analysis";
import { periodLabel } from "@/lib/analysis/time";
import type { Repository } from "@/types";

export type CheckState = "yes" | "no" | "unknown";

export interface Check {
  id: string;
  group: "Open source" | "Actively maintained" | "Open to contributions";
  /** The question, in the words of GitHub's Open Source Guide where one exists. */
  question: string;
  state: CheckState;
  /** What was observed, built only from calculated values. */
  answer: string;
  /** The threshold that decides yes or no. */
  rule: string;
  anchor: string;
}

export interface Checklist {
  checks: Check[];
  favourable: number;
  /** Checks that could be decided from the data (yes or no). */
  decided: number;
}

const plural = (n: number, word: string) =>
  `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

const hours = (h: number) =>
  h < 48 ? `${Math.max(1, Math.round(h))} hours` : `${Math.round(h / 24)} days`;

/**
 * Answers the questions a contributor is advised to ask before picking a project
 * (after "A checklist before you contribute", opensource.guide). Every answer has a
 * stated threshold. Where the data cannot decide, the state is "unknown" rather than a
 * guess: a partial list can prove a yes (a lower bound already meets the rule) but never
 * a no. Tone and friendliness are deliberately absent: they cannot be measured.
 */
export function buildChecklist(repository: Repository, analysis: Analysis): Checklist {
  const { activity, contributors, issues, pulls, maintenance, contributing } = analysis;
  const checks: Check[] = [];
  const add = (check: Check) => checks.push(check);

  const licenseFile = contributing.files?.find((f) => f.key === "license");
  const licensed = Boolean(repository.license) || (licenseFile?.url ?? null) !== null;
  add({
    id: "license",
    group: "Open source",
    question: "Does it have a license?",
    state: licensed ? "yes" : "no",
    answer: repository.license
      ? `${repository.license} license detected.`
      : licensed
        ? "A license file was detected."
        : "GitHub does not detect a license for this repository.",
    rule: "GitHub detects a license.",
    anchor: "start",
  });

  const lastCommit = maintenance.recency.find((r) => r.id === "commit")?.days ?? null;
  add({
    id: "latest-commit",
    group: "Actively maintained",
    question: "When was the latest commit?",
    state:
      !activity.available || lastCommit === null
        ? "unknown"
        : lastCommit <= 30
          ? "yes"
          : "no",
    answer:
      lastCommit === null
        ? "No commit was found on the default branch."
        : lastCommit === 0
          ? "Today, on the default branch."
          : `${plural(lastCommit, "day")} ago, on the default branch.`,
    rule: "Latest commit within the last 30 days.",
    anchor: "pulse",
  });

  // From here on, lists can be cut short on very busy repositories. A count taken from a
  // partial list is a lower bound, so it can prove a "yes" but never a "no".
  const fullYear = activity.windows[90].covered;
  const weeks =
    maintenance.activeWeeks ?? activity.weekly.filter((w) => w.count > 0).length;
  const commits30 = activity.windows[30].commits;
  add({
    id: "commit-rhythm",
    group: "Actively maintained",
    question: "How often do people commit?",
    state: !activity.available
      ? "unknown"
      : weeks >= 7 || commits30 >= 100
        ? "yes"
        : fullYear
          ? "no"
          : "unknown",
    answer: fullYear
      ? `Commits landed in ${weeks} of the last 13 weeks.`
      : commits30 >= 100
        ? `At least ${commits30.toLocaleString("en-US")} commits in the last 30 days.`
        : "Only part of the last 13 weeks could be read.",
    rule: "Commits in at least 7 of the last 13 weeks, or at least 100 commits in the last 30 days.",
    anchor: "pulse",
  });

  const c90 = contributors.windows[90];
  add({
    id: "contributors",
    group: "Actively maintained",
    question: "How many contributors does the project have?",
    state: c90.contributors >= 2 ? "yes" : c90.covered ? "no" : "unknown",
    answer: c90.covered
      ? `${c90.contributors} ${c90.contributors === 1 ? "person" : "people"} authored commits in the last 90 days.`
      : c90.contributors >= 2
        ? `At least ${c90.contributors} people authored commits recently.`
        : "Commit authors for the last 90 days are not fully covered.",
    rule: "More than one person authored commits in the last 90 days.",
    anchor: "people",
  });

  const i30 = issues.windows[30];
  add({
    id: "issues-closed",
    group: "Actively maintained",
    question: "Are issues getting closed?",
    state: !issues.available
      ? "unknown"
      : i30.resolved > 0
        ? "yes"
        : i30.covered
          ? "no"
          : "unknown",
    answer: !issues.available
      ? "Issues are not available for this repository."
      : i30.covered
        ? `${plural(i30.resolved, "issue")} closed and ${i30.opened} opened in the last 30 days.`
        : i30.resolved > 0
          ? `At least ${plural(i30.resolved, "issue")} closed in the last 30 days.`
          : "Issue activity for the last 30 days is not fully covered.",
    rule: "At least one issue closed in the last 30 days.",
    anchor: "pulse",
  });

  const lastMerge = maintenance.recency.find((r) => r.id === "merge")?.days ?? null;
  const p90 = pulls.windows[90];
  add({
    id: "recent-merge",
    group: "Open to contributions",
    question: "How recently were any pull requests merged?",
    state:
      lastMerge !== null
        ? lastMerge <= 30
          ? "yes"
          : "no"
        : p90.covered
          ? "no"
          : "unknown",
    answer:
      lastMerge !== null
        ? lastMerge === 0
          ? "A pull request was merged today."
          : `The last merge was ${plural(lastMerge, "day")} ago.`
        : p90.covered
          ? "No pull request was merged in the last 90 days."
          : "Pull request history is not fully covered.",
    rule: "A pull request merged within the last 30 days.",
    anchor: "journey",
  });

  // The question is whether outside work lands at all. A low share alone does not fail
  // it: popular projects close many drive-by submissions.
  const o = contributing.observed;
  const closed = o ? o.communityMerged + o.communityClosedUnmerged : 0;
  add({
    id: "community-merged",
    group: "Open to contributions",
    question: "Do outside pull requests get merged?",
    state: !o
      ? "unknown"
      : o.communityMerged >= 3
        ? "yes"
        : closed >= 3 && o.days >= 30
          ? "no"
          : "unknown",
    answer: !o
      ? "Pull request history could not be read."
      : closed === 0
        ? `No community pull request was merged or closed in the last ${periodLabel(o.days)}.`
        : `${plural(o.communityMerged, "community pull request")} merged in the last ${periodLabel(o.days)}, out of ${closed} closed.`,
    rule: "At least 3 pull requests from outside the team were merged. A no needs at least 30 days of history with 3 or more closed.",
    anchor: "journey",
  });

  const r = contributing.observedReplies;
  // Only threads at least two days old are judged: newer ones have not had a fair chance.
  const handledShare =
    r && r.matureThreads > 0 ? r.matureHandled / r.matureThreads : null;
  add({
    id: "responsive",
    group: "Open to contributions",
    question: "Do maintainers respond quickly?",
    state:
      !r || r.matureThreads < 3
        ? "unknown"
        : handledShare! >= 0.5 &&
            (r.medianHoursToResponse === null || r.medianHoursToResponse <= 48)
          ? "yes"
          : "no",
    answer: !r
      ? "Comment history could not be read."
      : r.matureThreads < 3
        ? r.days < 3
          ? `Only the last ${periodLabel(r.days)} of conversation could be read, which is too short to judge reply times.`
          : `Only ${plural(r.matureThreads, "community thread")} old enough to judge in the last ${periodLabel(r.days)}.`
        : `${r.matureHandled} of ${r.matureThreads} community threads were answered or closed${
            r.medianHoursToResponse === null
              ? "."
              : `; a first reply typically takes ${hours(r.medianHoursToResponse)}.`
          }`,
    rule: "At least half of community threads older than two days were answered or closed, with a median first reply within 48 hours.",
    anchor: "journey",
  });

  const guide = contributing.files?.find((f) => f.key === "contributing");
  add({
    id: "guide",
    group: "Open to contributions",
    question: "Is there a contributing guide?",
    state: !contributing.files ? "unknown" : guide?.url != null ? "yes" : "no",
    answer: !contributing.files
      ? "GitHub did not return a community profile."
      : guide?.url != null
        ? "A contributing guide was detected."
        : "No contributing guide in the standard locations.",
    rule: "GitHub detects a CONTRIBUTING file.",
    anchor: "start",
  });

  const { starter } = contributing;
  add({
    id: "starter",
    group: "Open to contributions",
    question: "Are there issues marked for newcomers?",
    state: !starter.available ? "unknown" : starter.unassigned > 0 ? "yes" : "no",
    answer: !starter.available
      ? "GitHub did not return labelled issues."
      : starter.unassigned > 0
        ? `${plural(starter.unassigned, "unassigned issue")} labelled good first issue or help wanted.`
        : "No unassigned issues carry GitHub's default newcomer labels.",
    rule: "At least one unassigned open issue labelled good first issue or help wanted.",
    anchor: "start",
  });

  if (repository.archived) {
    // An archived repository is read-only: nothing else on the list can outweigh that.
    checks.unshift({
      id: "archived",
      group: "Open source",
      question: "Is the repository open for changes?",
      state: "no",
      answer: "The owner has archived this repository. It is read-only.",
      rule: "The repository is not archived.",
      anchor: "pulse",
    });
  }

  return {
    checks,
    favourable: checks.filter((c) => c.state === "yes").length,
    decided: checks.filter((c) => c.state !== "unknown").length,
  };
}
