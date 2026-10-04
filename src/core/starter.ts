/** Beginner labels and the "is this issue actually free" state machine. */

export type StarterLabelClass = "beginner" | "help-wanted";

const BEGINNER = new Set([
  "good first issue",
  "good first bug",
  "good first contribution",
  "good first pr",
  "good first task",
  "first timers only",
  "first timer",
  "first time contributor",
  "first contribution",
  "beginner",
  "beginners",
  "beginner friendly",
  "for beginners",
  "easy",
  "easy fix",
  "easy pick",
  "easy picks",
  "easy task",
  "difficulty easy",
  "difficulty beginner",
  "difficulty starter",
  "level easy",
  "level beginner",
  "level starter",
  "starter",
  "starter bug",
  "starter issue",
  "starter task",
  "newcomer",
  "newcomers",
  "new contributor",
  "new contributors",
  "newbie",
  "low hanging fruit",
  "up for grabs",
  "gfi",
  "e easy",
  "d easy",
  "exp beginner",
  "contributor friendly",
  "junior job",
  "jump in",
  "trivial",
]);

const HELP_WANTED = new Set([
  "help wanted",
  "helpwanted",
  "help needed",
  "status help wanted",
  "contributions welcome",
  "contribution welcome",
  "pr welcome",
  "prs welcome",
  "pull requests welcome",
  "accepting prs",
  "accepting pull requests",
]);

/** Lower-cases a label and reduces punctuation, emoji and separators to single spaces. */
export function normaliseLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function starterLabelClass(label: string): StarterLabelClass | null {
  const name = normaliseLabel(label);
  if (BEGINNER.has(name)) return "beginner";
  if (HELP_WANTED.has(name)) return "help-wanted";
  return null;
}

/** The strongest class among an issue's labels; beginner outranks help wanted. */
export function starterClassOf(labels: readonly string[]): StarterLabelClass | null {
  let found: StarterLabelClass | null = null;
  for (const label of labels) {
    const cls = starterLabelClass(label);
    if (cls === "beginner") return cls;
    if (cls) found = cls;
  }
  return found;
}

const CLAIM = new RegExp(
  [
    "\\b(?:can|could|may|shall|should) i (?:please )?(?:work on|take|pick|try|tackle|handle|fix|do|contribute|be assigned|get assigned|have)",
    "\\bi(?:'d| would) (?:like|love) to (?:work on|take|pick|tackle|fix|contribute|give|try|be assigned|solve|handle)",
    "\\bi(?:'m| am) (?:working on|taking|picking|going to work on|on it|interested in (?:working|taking|fixing|solving))",
    "\\bi(?:'ll| will) (?:work on|take|pick|fix|tackle|give|try|handle)",
    "\\bi want to (?:work on|take|fix|solve|contribute)",
    "\\b(?:please |kindly )?assign (?:this |it )?(?:issue |one )?to me\\b",
    "\\bassign me\\b",
    "\\bi(?:'ve| have) (?:started|opened a pr|raised a pr|created a pr)",
    "\\bis (?:this|it) (?:still )?(?:open|available|up for grabs|free to (?:take|work))",
    "^/assign\\s*$",
    "^\\.take\\s*$",
    "^/take\\s*$",
  ].join("|"),
  "im",
);

/** Whether a comment reads as someone asking for, or announcing, work on the issue. */
export function isClaimComment(body: string): boolean {
  return CLAIM.test(body);
}

export type StarterState = "available" | "claimed" | "in-progress" | "stale";

export interface StarterFacts {
  /** Number of people assigned. */
  assignees: number;
  /** Open or merged pull requests that reference or close this issue. */
  linkedOpenPulls: number;
  /** Most recent claim comment, if any. */
  lastClaimAt: string | null;
  /** Most recent activity of any kind on the issue. */
  updatedAt: string;
}

export const CLAIM_WINDOW_DAYS = 14;
export const STALE_AFTER_DAYS = 60;

const DAY_MS = 86_400_000;

/**
 * One state per open issue. Order matters: a linked open pull request is the
 * strongest signal, then an assignee or a recent claim, then silence.
 */
export function starterState(facts: StarterFacts, now: Date): StarterState {
  if (facts.linkedOpenPulls > 0) return "in-progress";
  if (facts.assignees > 0) return "claimed";
  if (facts.lastClaimAt !== null) {
    const age = now.getTime() - Date.parse(facts.lastClaimAt);
    if (age < CLAIM_WINDOW_DAYS * DAY_MS) return "claimed";
  }
  const idle = now.getTime() - Date.parse(facts.updatedAt);
  if (idle >= STALE_AFTER_DAYS * DAY_MS) return "stale";
  return "available";
}
