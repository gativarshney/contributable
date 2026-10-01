/** Small text heuristics over GitHub content. Each is deliberately conservative. */

/**
 * Pull request and issue numbers a commit message refers to ("#123"), and the GitHub
 * logins it credits with a Co-authored-by trailer. Logins are read from GitHub's
 * noreply addresses, the only place a trailer reliably names an account.
 */
export function parseCommitMessage(message: string): {
  refs: number[];
  coAuthors: string[];
} {
  const refs = new Set<number>();
  for (const match of message.matchAll(/#(\d{1,7})\b/g)) refs.add(Number(match[1]));

  const coAuthors = new Set<string>();
  const trailer =
    /^co-authored-by:.*<(?:\d+\+)?([a-z\d-]+)@users\.noreply\.github\.com>/gim;
  for (const match of message.matchAll(trailer)) coAuthors.add(match[1].toLowerCase());

  return { refs: [...refs], coAuthors: [...coAuthors] };
}

const CLAIM = new RegExp(
  [
    "\\b(?:can|could|may|shall) i (?:work on|take|pick|try|tackle|handle|fix|do|contribute)",
    "\\bi(?:'d| would) (?:like|love) to (?:work on|take|pick|tackle|fix|contribute|give)",
    "\\bi(?:'m| am) (?:working on|taking|picking|going to work on|on it)",
    "\\bi(?:'ll| will) (?:work on|take|pick|fix|tackle|give)",
    "\\b(?:please )?assign (?:this |it )?(?:issue )?to me\\b",
    "\\bassign me\\b",
    "\\bi(?:'ve| have) (?:started|opened a pr|raised a pr)",
  ].join("|"),
  "i",
);

/** Whether a comment reads as someone asking for, or announcing, work on the issue. */
export function isClaim(body: string): boolean {
  return CLAIM.test(body);
}

/** Accounts that enforce a contributor licence agreement on pull requests. */
export function isClaBot(login: string): boolean {
  return /(?:^|[-_])cla(?:[-_]|assistant|bot|$)|easycla|claassistant|license\/cla/i.test(
    login,
  );
}

// SPDX identifiers of licences that publish the source without granting open source
// freedoms. Matched by prefix, because several come in versioned variants.
const SOURCE_AVAILABLE = [
  "BUSL",
  "Elastic",
  "SSPL",
  "FSL",
  "PolyForm",
  "Commons-Clause",
  "CC-BY-NC",
  "CC-BY-ND",
];

/** True for source-available licences such as Elastic License 2.0 or the BUSL. */
export function isSourceAvailable(license: string | null): boolean {
  if (!license) return false;
  const id = license.toLowerCase();
  return SOURCE_AVAILABLE.some((prefix) => id.startsWith(prefix.toLowerCase()));
}
