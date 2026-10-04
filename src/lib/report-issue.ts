const NEW_ISSUE = "https://github.com/gativarshney/contributable/issues/new";
const SITE = "https://contributable.vercel.app";

/**
 * A link that opens a "figure looks wrong" issue already filled in with the repository,
 * the figures the page showed and when they were read, so the visitor only has to add
 * what GitHub shows. Same headings as the issue template.
 */
export function wrongNumberUrl({
  repo,
  shown,
  when,
}: {
  /** owner/name */
  repo: string;
  /** The figures on the page, one per line, e.g. "First reply: 8 h (median of 60 outside PRs)". */
  shown: string[];
  /** When the figures were read, as shown on the page. */
  when: string;
}): string {
  const body = [
    "**Repository analysed**",
    "",
    `https://github.com/${repo}`,
    "",
    "**What Contributable showed**",
    "",
    ...shown.map((line) => `- ${line}`),
    "",
    `Page: ${SITE}/repo/${repo}`,
    "",
    "**What GitHub shows**",
    "",
    "<!-- A link or a search that shows the real number, and which figure it is about. -->",
    "",
    "**When you ran it**",
    "",
    when,
  ].join("\n");
  const params = new URLSearchParams({
    title: `A figure looks wrong: ${repo}`,
    labels: "bug",
    body,
  });
  return `${NEW_ISSUE}?${params.toString()}`;
}
