/**
 * The username from what someone typed: a plain name, "@name", or a pasted profile link
 * such as https://github.com/name. Null when it cannot be a GitHub username.
 */
export function githubLogin(input: string): string | null {
  const login = input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login) ? login : null;
}

/** What GitHub's list of a user's repositories gives us, trimmed to what we use. */
export interface PublicRepo {
  language: string | null;
  fork: boolean;
}

/** Notebooks are almost always Python; counting them as their own language adds noise. */
const ALIASES: Record<string, string> = {
  "Jupyter Notebook": "Python",
};

/**
 * Markup and styling. Worth listing only when nothing else is there: next to a real
 * language they match almost every web repository and blur the shortlist.
 */
const MARKUP = new Set(["HTML", "CSS", "SCSS", "Sass", "Less", "Stylus"]);

/**
 * The languages someone writes, most used first, from their own public repositories.
 * Forks are left out: forking a project says nothing about what you write.
 */
export function stackFromRepos(repos: readonly PublicRepo[], limit = 5): string[] {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (repo.fork || !repo.language) continue;
    const language = ALIASES[repo.language] ?? repo.language;
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l);
  const code = ranked.filter((language) => !MARKUP.has(language));
  return (code.length > 0 ? code : ranked).slice(0, limit).map((l) => l.toLowerCase());
}

/** Why a lookup gave nothing, so the visitor is told what actually happened. */
export type LookupProblem =
  | { kind: "invalid" }
  | { kind: "not-found" }
  | { kind: "rate-limited"; minutes: number | null }
  | { kind: "empty" }
  | { kind: "unavailable" };

/** Reads a failed GitHub response: a spent allowance looks like a 403 or 429. */
export function problemFromResponse(
  status: number,
  remaining: string | null,
  reset: string | null,
  now = Date.now(),
): LookupProblem {
  if (status === 404) return { kind: "not-found" };
  if (status === 429 || (status === 403 && remaining === "0")) {
    const at = Number(reset) * 1000;
    const minutes = at > now ? Math.max(1, Math.ceil((at - now) / 60_000)) : null;
    return { kind: "rate-limited", minutes };
  }
  return { kind: "unavailable" };
}

/** The sentence shown under the field for each problem. */
export function problemMessage(problem: LookupProblem): string {
  switch (problem.kind) {
    case "invalid":
      return "That doesn't look like a GitHub username. Type the name, or paste your profile link.";
    case "not-found":
      return "No GitHub user with that name. Check the spelling.";
    case "rate-limited":
      return `GitHub limits how often a network can look this up without signing in, and that limit was reached. Try again${problem.minutes ? ` in about ${problem.minutes} min` : " in a while"}, or type your stack instead.`;
    case "empty":
      return "Found no languages in your own public repositories (forks are not counted). Type your stack instead.";
    case "unavailable":
      return "Couldn't reach GitHub just now. Try again, or type your stack instead.";
  }
}
