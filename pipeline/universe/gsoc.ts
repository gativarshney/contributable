/**
 * Builds the Tier 1 list: every organisation in Google Summer of Code for the given
 * years, mapped to the GitHub organisations or repositories it develops in.
 *
 *   npx tsx pipeline/universe/gsoc.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const ROOT = process.cwd();

export const GSOC_YEARS = [2024, 2025, 2026];

const apiOrg = z.object({
  name: z.string(),
  slug: z.string(),
  website_url: z.string().nullish(),
  source_code: z.string().nullish(),
  ideas_link: z.string().nullish(),
  ideas_list_url: z.string().nullish(),
  logo_url: z.string().nullish(),
  tagline: z.string().nullish(),
  categories: z.array(z.string()).default([]),
  contributor_guidance_url: z.string().nullish(),
  tech_tags: z.array(z.string()).default([]),
  topic_tags: z.array(z.string()).default([]),
});

const override = z.object({
  github: z.array(z.string()).optional(),
  unmappable: z.string().optional(),
});

export interface GsocOrg {
  slug: string;
  name: string;
  years: number[];
  website: string | null;
  tech: string[];
  topics: string[];
  /** From the programme listing, most recent year the organisation took part. */
  logo: string | null;
  tagline: string | null;
  categories: string[];
  ideas: string | null;
  /** GitHub organisations whose active repositories are indexed. */
  orgs: string[];
  /** Single repositories, for projects that live inside someone else's organisation. */
  repos: string[];
  /** Set when the project cannot be measured on GitHub, with the reason. */
  unmappable: string | null;
}

const GITHUB = /github\.com\/([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+))?/i;
const NOT_OWNERS = new Set([
  "orgs",
  "topics",
  "sponsors",
  "about",
  "features",
  "settings",
]);

export function parseGithub(
  url: string | null | undefined,
): { owner: string; repo: string | null } | null {
  if (!url) return null;
  const orgsPath = /github\.com\/orgs\/([A-Za-z0-9_.-]+)/i.exec(url);
  if (orgsPath) return { owner: orgsPath[1], repo: null };
  const match = GITHUB.exec(url);
  if (!match || NOT_OWNERS.has(match[1].toLowerCase())) return null;
  const repo = match[2]?.replace(/\.git$/, "") ?? null;
  return { owner: match[1], repo: repo && repo.length > 0 ? repo : null };
}

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function fetchYear(year: number): Promise<z.infer<typeof apiOrg>[]> {
  const response = await fetch(
    `https://summerofcode.withgoogle.com/api/program/${year}/organizations/`,
  );
  if (!response.ok) throw new Error(`GSoC ${year}: HTTP ${response.status}`);
  return z.array(apiOrg).parse(await response.json());
}

export async function buildGsocUniverse(years = GSOC_YEARS): Promise<GsocOrg[]> {
  const overrides = z
    .record(z.string(), override)
    .parse(JSON.parse(readFileSync(join(ROOT, "universe/gsoc-overrides.json"), "utf8")));
  const bySlug = new Map<string, GsocOrg & { source: string | null }>();

  for (const year of years) {
    for (const org of await fetchYear(year)) {
      const entry = bySlug.get(org.slug) ?? {
        slug: org.slug,
        name: org.name,
        years: [],
        website: null,
        tech: [],
        topics: [],
        logo: null,
        tagline: null,
        categories: [],
        ideas: null,
        orgs: [],
        repos: [],
        unmappable: null,
        source: null,
      };
      entry.name = org.name;
      entry.years.push(year);
      entry.website = org.website_url ?? entry.website;
      entry.logo = org.logo_url ?? entry.logo;
      entry.tagline = org.tagline ?? entry.tagline;
      entry.ideas = org.ideas_link ?? org.ideas_list_url ?? entry.ideas;
      if (org.categories.length > 0) entry.categories = org.categories;
      entry.source = org.source_code ?? entry.source;
      entry.tech = [
        ...new Set([...entry.tech, ...org.tech_tags.map((t) => t.toLowerCase())]),
      ];
      entry.topics = [
        ...new Set([...entry.topics, ...org.topic_tags.map((t) => t.toLowerCase())]),
      ];
      bySlug.set(org.slug, entry);
    }
  }

  const result: GsocOrg[] = [];
  for (const { source, ...entry } of bySlug.values()) {
    const rule = overrides[entry.slug];
    const parsed = parseGithub(source);
    if (rule?.github) {
      for (const target of rule.github) {
        if (target.includes("/")) entry.repos.push(target);
        else entry.orgs.push(target);
      }
    } else if (rule?.unmappable) {
      entry.unmappable = rule.unmappable;
    } else if (parsed?.repo) {
      entry.repos.push(`${parsed.owner}/${parsed.repo}`);
      // A repository named after its own account (sympy/sympy) means the account is
      // the project, so its other active repositories are indexed as well.
      if (parsed.owner.toLowerCase() === parsed.repo.toLowerCase()) {
        entry.orgs.push(parsed.owner);
      }
    } else if (parsed) {
      entry.orgs.push(parsed.owner);
    } else {
      const host = hostOf(source);
      entry.unmappable = host
        ? `Development happens outside GitHub (${host}).`
        : "No public source repository is listed.";
    }
    result.push(entry);
  }
  return result.sort((a, b) => a.slug.localeCompare(b.slug));
}

async function main() {
  const orgs = await buildGsocUniverse();
  writeFileSync(
    join(ROOT, "universe/gsoc.json"),
    `${JSON.stringify(orgs, null, 1)}
`,
  );
  const mapped = orgs.filter((o) => !o.unmappable).length;
  console.log(
    `${orgs.length} organisations, ${mapped} mapped, ${orgs.length - mapped} marked unmappable`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
