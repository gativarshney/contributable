export interface RepoRef {
  owner: string;
  name: string;
}

export type ParseResult =
  | { ok: true; ref: RepoRef }
  | { ok: false; reason: "empty" | "not_github" | "malformed" };

const OWNER = /^[a-z\d](?:[a-z\d-]{0,38})$/i;
const NAME = /^[\w.-]{1,100}$/;
// First path segments on github.com that are product pages, not accounts.
const RESERVED = new Set([
  "about",
  "explore",
  "features",
  "issues",
  "login",
  "marketplace",
  "notifications",
  "orgs",
  "pricing",
  "pulls",
  "search",
  "settings",
  "sponsors",
  "topics",
  "trending",
]);

function validate(owner: string, rawName: string): ParseResult {
  const name = rawName.replace(/\.git$/i, "");
  if (!OWNER.test(owner) || RESERVED.has(owner.toLowerCase())) {
    return { ok: false, reason: "malformed" };
  }
  if (!NAME.test(name) || name === "." || name === "..") {
    return { ok: false, reason: "malformed" };
  }
  return { ok: true, ref: { owner, name } };
}

/**
 * Accepts the forms people actually paste: full URLs (with or without a scheme, with
 * trailing paths such as /tree/main), SSH remotes, and the owner/name shorthand.
 */
export function parseRepoInput(input: string): ParseResult {
  const value = input.trim();
  if (!value) return { ok: false, reason: "empty" };

  const ssh = /^git@github\.com:([^/\s]+)\/([^/\s]+)$/i.exec(value);
  if (ssh) return validate(ssh[1], ssh[2]);

  const shorthand = /^([^/\s:]+)\/([^/\s]+)$/.exec(value);
  if (shorthand && !shorthand[1].includes("."))
    return validate(shorthand[1], shorthand[2]);

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "malformed" };
  }
  const host = url.hostname.toLowerCase();
  if (!host.includes(".")) return { ok: false, reason: "malformed" };
  if (host !== "github.com" && host !== "www.github.com") {
    return { ok: false, reason: "not_github" };
  }
  const [owner, name] = url.pathname.split("/").filter(Boolean);
  if (!owner || !name) return { ok: false, reason: "malformed" };
  return validate(owner, name);
}

export function parseErrorMessage(reason: "empty" | "not_github" | "malformed"): string {
  switch (reason) {
    case "empty":
      return "Paste a public GitHub repository URL to analyze.";
    case "not_github":
      return "Contributable only reads repositories hosted on github.com.";
    default:
      return "That doesn't look like a valid GitHub repository URL.";
  }
}
