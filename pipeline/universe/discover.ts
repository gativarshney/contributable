/**
 * Turns the list of GSoC organisations into the list of repositories to index.
 * An organisation's GitHub account can hold hundreds of repositories; only the ones
 * a newcomer could plausibly contribute to are kept.
 */
import type { GraphQLClient } from "../../src/core/github/client";
import { GitHubError } from "../../src/core/github/client";
import type { ProgramEntry, UniverseRepo } from "../../src/core/published";
import type { GsocOrg } from "./gsoc";

/** A repository nobody pushed to in this long is not somewhere to start. */
export const ACTIVE_WITHIN_DAYS = 180;
/** Most starred active repositories kept per GitHub account. */
export const MAX_REPOS_PER_ACCOUNT = 8;

const DAY_MS = 86_400_000;

const ACCOUNT_REPOS = `
query ($login: String!) {
  repositoryOwner(login: $login) {
    repositories(first: 60, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false,
                 orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        name
        isArchived
        isMirror
        isTemplate
        isDisabled
        pushedAt
        stargazerCount
        pullRequests { totalCount }
      }
    }
  }
}`;

interface RawRepo {
  name: string;
  isArchived: boolean;
  isMirror: boolean;
  isTemplate: boolean;
  isDisabled: boolean;
  pushedAt: string | null;
  stargazerCount: number;
  pullRequests: { totalCount: number };
}

/** The repositories of one account worth indexing, most starred first. */
export function pickRepos(repos: RawRepo[], now: Date): string[] {
  const cutoff = now.getTime() - ACTIVE_WITHIN_DAYS * DAY_MS;
  return repos
    .filter(
      (r) =>
        !r.isArchived &&
        !r.isMirror &&
        !r.isTemplate &&
        !r.isDisabled &&
        r.pushedAt !== null &&
        Date.parse(r.pushedAt) >= cutoff &&
        // Without pull requests there is nothing to measure.
        r.pullRequests.totalCount >= 5 &&
        r.name !== ".github",
    )
    .sort((a, b) => b.stargazerCount - a.stargazerCount)
    .slice(0, MAX_REPOS_PER_ACCOUNT)
    .map((r) => r.name);
}

export async function discoverUniverse(
  client: GraphQLClient,
  orgs: GsocOrg[],
  now: Date,
  shouldStop: () => boolean = () => false,
): Promise<{ repos: UniverseRepo[]; complete: boolean; missing: string[] }> {
  const byId = new Map<string, UniverseRepo>();
  const missing: string[] = [];
  let complete = true;

  const add = (owner: string, name: string, entry: ProgramEntry) => {
    const key = `${owner}/${name}`.toLowerCase();
    const existing = byId.get(key);
    if (!existing) byId.set(key, { owner, name, programs: [entry] });
    else if (!existing.programs.some((p) => p.slug === entry.slug))
      existing.programs.push(entry);
  };

  for (const org of orgs) {
    if (org.unmappable) continue;
    const entry: ProgramEntry = {
      program: "gsoc",
      slug: org.slug,
      name: org.name,
      years: org.years,
    };
    for (const full of org.repos) {
      const [owner, name] = full.split("/");
      if (owner && name) add(owner, name, entry);
    }
    for (const login of org.orgs) {
      if (shouldStop()) {
        complete = false;
        break;
      }
      try {
        const data = await client.query<{
          repositoryOwner: { repositories: { nodes: RawRepo[] } } | null;
        }>(ACCOUNT_REPOS, { login });
        if (!data.repositoryOwner) {
          missing.push(login);
          continue;
        }
        for (const name of pickRepos(data.repositoryOwner.repositories.nodes, now)) {
          add(login, name, entry);
        }
      } catch (error) {
        if (error instanceof GitHubError && error.kind === "rate-limited") {
          complete = false;
          break;
        }
        missing.push(login);
      }
    }
    if (!complete) break;
  }

  const repos = [...byId.values()].sort((a, b) =>
    `${a.owner}/${a.name}`.localeCompare(`${b.owner}/${b.name}`),
  );
  return { repos, complete, missing };
}
