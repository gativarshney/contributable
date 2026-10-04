/**
 * Some projects say in their README or contributing guide that they do not take pull
 * requests on the repository, or have stopped taking them for now. The figures can still
 * look healthy (the team merges its own work, or pulls changes in from forks), so the
 * project's own words have to win. This finds that statement.
 */
const PATTERNS: RegExp[] = [
  // "We don't run an inbound review queue on this repo."
  /\b(?:do not|don['’]t|does not|doesn['’]t)\s+(?:run|have|maintain|keep)\s+an?\s+(?:inbound\s+|public\s+|open\s+)?review\s+queue/i,
  // "We are not accepting pull requests / contributions at this time."
  /\b(?:not|no\s+longer)\s+(?:currently\s+|actively\s+)?(?:accept(?:ing)?|tak(?:e|ing)|review(?:ing)?|look(?:ing)?\s+for)\s+(?:any\s+)?(?:new\s+|outside\s+|external\s+|community\s+|third[- ]party\s+|unsolicited\s+)?(?:pull\s+requests|PRs|contributions|patches|code\s+contributions)\b/i,
  // "We do not accept / will not merge outside pull requests."
  /\b(?:do\s+not|don['’]t|will\s+not|won['’]t|cannot|can['’]t)\s+(?:normally\s+|generally\s+|usually\s+|currently\s+)?(?:accept|review|merge)\s+(?:any\s+)?(?:outside\s+|external\s+|community\s+|third[- ]party\s+|unsolicited\s+)?(?:pull\s+requests|PRs|contributions|patches)\b/i,
  // "This project is closed to contributions."
  /\bclosed\s+to\s+(?:outside\s+|external\s+|new\s+)?contributions\b/i,
  // "Pull requests will be closed without review."
  /\b(?:pull\s+requests|PRs)\s+(?:are|will\s+be)\s+(?:automatically\s+)?(?:closed|ignored|not\s+(?:accepted|reviewed|merged))\b/i,
  // "Contributions are paused / not being accepted."
  /\bcontributions\s+(?:are|have\s+been)\s+(?:currently\s+)?(?:paused|closed|suspended|not\s+being\s+accepted)\b/i,
];

const MAX_QUOTE = 240;

function clean(block: string): string {
  return block
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The sentence around a match, cleaned of Markdown, or null when no statement is found. */
export function pullRequestPolicy(
  texts: readonly (string | null | undefined)[],
): string | null {
  // Paragraph by paragraph, so a heading never runs into the sentence after it.
  const blocks = texts.flatMap((text) =>
    text
      ? text
          .replace(/<!--[\s\S]*?-->/g, " ")
          .replace(/```[\s\S]*?```/g, " ")
          .split(/\n\s*\n|\n(?=\s*#)|\n(?=\s*[-*] )/)
      : [],
  );
  for (const block of blocks) {
    const plain = clean(block);
    for (const pattern of PATTERNS) {
      const match = pattern.exec(plain);
      if (!match) continue;
      const start = Math.max(
        plain.lastIndexOf(". ", match.index) + 1,
        plain.lastIndexOf("! ", match.index) + 1,
        plain.lastIndexOf("? ", match.index) + 1,
        0,
      );
      const after = plain.slice(match.index).search(/[.!?](\s|$)/);
      const end = after === -1 ? plain.length : match.index + after + 1;
      const sentence = plain.slice(start, end).trim();
      return sentence.length > MAX_QUOTE
        ? `${sentence.slice(0, MAX_QUOTE - 1).trimEnd()}…`
        : sentence;
    }
  }
  return null;
}
