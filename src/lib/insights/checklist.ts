import type { Analysis } from "@/lib/analysis";
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
 * guess. Tone and friendliness are deliberately absent: they cannot be measured.
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
    anchor: "contributing",
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
    anchor: "maintenance",
  });

  const weeks = maintenance.activeWeeks;
  add({
    id: "commit-rhythm",
    group: "Actively maintained",
    question: "How often do people commit?",
    state: weeks === null ? "unknown" : weeks >= 7 ? "yes" : "no",
    answer:
      weeks === null
        ? "Commit history for the last 13 weeks is not fully covered."
        : `Commits landed in ${weeks} of the last 13 weeks.`,
    rule: "Commits in at least 7 of the last 13 weeks.",
    anchor: "activity",
  });

  const c90 = contributors.windows[90];
  add({
    id: "contributors",
    group: "Actively maintained",
    question: "How many contributors does the project have?",
    state: !c90.covered ? "unknown" : c90.contributors >= 2 ? "yes" : "no",
    answer: c90.covered
      ? `${c90.contributors} ${c90.contributors === 1 ? "person" : "people"} authored commits in the last 90 days.`
      : "Commit authors for the last 90 days are not fully covered.",
    rule: "More than one person authored commits in the last 90 days.",
    anchor: "contributors",
  });

  const i30 = issues.windows[30];
  add({
    id: "issues-closed",
    group: "Actively maintained",
    question: "Are issues getting closed?",
    state:
      !issues.available || !i30.covered ? "unknown" : i30.resolved > 0 ? "yes" : "no",
    answer: !issues.available
      ? "Issues are not available for this repository."
      : !i30.covered
        ? "Issue activity for the last 30 days is not fully covered."
        : `${plural(i30.resolved, "issue")} closed and ${i30.opened} opened in the last 30 days.`,
    rule: "At least one issue closed in the last 30 days.",
    anchor: "issues",
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
    anchor: "pull-requests",
  });

  // Use the widest window the data fully covers, so busy repositories still get an answer.
  const window = ([90, 30, 7] as const).find((d) => contributing.windows[d].covered);
  const w = window ? contributing.windows[window] : null;
  const closed = w ? w.communityMerged + w.communityClosedUnmerged : 0;
  add({
    id: "community-merged",
    group: "Open to contributions",
    question: "Do outside pull requests get merged?",
    state:
      !w || closed < 3 || w.mergeShare === null
        ? "unknown"
        : w.mergeShare >= 50
          ? "yes"
          : "no",
    answer: !w
      ? "Pull request history is not fully covered."
      : closed < 3
        ? `Only ${plural(closed, "community pull request")} closed in the last ${window} days; too few to say.`
        : `${w.communityMerged} of ${closed} community pull requests closed in the last ${window} days were merged (${w.mergeShare}%).`,
    rule: "At least half of community pull requests were merged, with 3 or more closed.",
    anchor: "contributing",
  });

  const responseWindow = ([90, 30, 7] as const).find(
    (d) => contributing.windows[d].responseCovered,
  );
  const r = responseWindow ? contributing.windows[responseWindow] : null;
  const answeredShare = r && r.threads > 0 ? r.answered / r.threads : null;
  add({
    id: "responsive",
    group: "Open to contributions",
    question: "Do maintainers respond quickly?",
    state:
      !r || r.threads < 3 || r.medianHoursToResponse === null
        ? "unknown"
        : r.medianHoursToResponse <= 48 && answeredShare! >= 0.5
          ? "yes"
          : "no",
    answer: !r
      ? "Comment history is not fully covered."
      : r.threads < 3
        ? `Only ${plural(r.threads, "community thread")} opened in the last ${responseWindow} days; too few to say.`
        : r.medianHoursToResponse === null
          ? `None of ${r.threads} community threads has a response yet.`
          : `${r.answered} of ${r.threads} community threads got a human reply, typically within ${hours(r.medianHoursToResponse)}.`,
    rule: "Median first reply within 48 hours and at least half of community threads answered.",
    anchor: "contributing",
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
    anchor: "contributing",
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
    anchor: "contributing",
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
      anchor: "maintenance",
    });
  }

  return {
    checks,
    favourable: checks.filter((c) => c.state === "yes").length,
    decided: checks.filter((c) => c.state !== "unknown").length,
  };
}
