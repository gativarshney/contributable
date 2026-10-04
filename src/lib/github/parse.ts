export interface RepoRef {
  owner: string;
  name: string;
}

export type ParseReason = "empty" | "not_github" | "malformed" | "account";

export type ParseResult = { ok: true; ref: RepoRef } | { ok: false; reason: ParseReason };

const OWNER = /^[a-z\d](?:[a-z\d-]{0,38})$/i;
const NAME = /^[\w.-]{1,100}$/;
const HOSTS = new Set(["github.com", "www.github.com", "m.github.com"]);
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

/** Brackets, quotes and sentence punctuation around a paste, and spaces around the slash. */
function tidy(value: string): string {
  return value
    .trim()
    .replace(/^[<("'`[]+|[>)"'`\]]+$/g, "")
    .replace(/(?<=\w)[.,;:!?]+$/, "")
    .replace(/\s*\/\s*/g, "/");
}

/**
 * From a pasted command or sentence ("git clone https://github.com/a/b.git",
 * "gh repo clone a/b"), the part that names the repository.
 */
function pick(value: string): string {
  if (!/\s/.test(value)) return value;
  const tokens = value.split(/\s+/).map(tidy).filter(Boolean);
  return (
    tokens.find((token) => /github\.com[/:]/i.test(token)) ??
    [...tokens].reverse().find((token) => /^[\w-]+\/[\w.-]+/.test(token)) ??
    value
  );
}

/**
 * Accepts the forms people actually paste: full URLs (with or without a scheme, with
 * trailing paths such as /tree/main), SSH remotes, the owner/name shorthand with or
 * without a trailing path, and a whole clone command.
 */
export function parseRepoInput(input: string): ParseResult {
  const value = pick(tidy(input)).replace(/^ssh:\/\/(?:git@)?/i, "https://");
  if (!value) return { ok: false, reason: "empty" };

  const ssh = /^git@github\.com:([^/\s]+)\/([^/\s]+)/i.exec(value);
  if (ssh) return validate(ssh[1], ssh[2]);

  const shorthand = /^([^/\s:]+)\/([^/\s?#]+)(?:[/?#].*)?$/.exec(value);
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
  if (!HOSTS.has(host)) return { ok: false, reason: "not_github" };
  const [owner, name] = url.pathname.split("/").filter(Boolean);
  if (owner && !name && OWNER.test(owner) && !RESERVED.has(owner.toLowerCase())) {
    return { ok: false, reason: "account" };
  }
  if (!owner || !name) return { ok: false, reason: "malformed" };
  return validate(owner, name);
}

export function parseErrorMessage(reason: ParseReason): string {
  switch (reason) {
    case "empty":
      return "Paste a public GitHub repository URL to analyze.";
    case "not_github":
      return "Contributable only reads repositories hosted on github.com.";
    case "account":
      return "That is an account, not a repository. Add the repository name, for example github.com/vercel/next.js.";
    default:
      return "That doesn't look like a GitHub repository. Try owner/name, for example vercel/next.js.";
  }
}
