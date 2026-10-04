import { z } from "zod";

/** Bumped whenever a stored or published shape changes in a way readers must handle. */
export const SCHEMA_VERSION = 3;

export const authorClass = z.enum(["core", "outside", "bot"]);

const isoDate = z.string().min(10);

/**
 * What the metrics need to know about one pull request. Authors are stored as a short
 * one-way hash: enough to tell "same person as before" without publishing who.
 */
export const pullSummary = z.object({
  n: z.number().int().positive(),
  createdAt: isoDate,
  closedAt: isoDate.nullable(),
  mergedAt: isoDate.nullable(),
  updatedAt: isoDate,
  cls: authorClass,
  author: z.string().nullable(),
  /** First comment, review or review comment by a person other than the author. */
  firstResponseAt: isoDate.nullable(),
  /** Times core members replied, for the repo-level response window. */
  coreReplyAt: z.array(isoDate),
  /** Hashes of the core members who replied or merged. */
  coreActors: z.array(z.string()),
});
export type PullSummary = z.infer<typeof pullSummary>;

export const issueSummary = z.object({
  n: z.number().int().positive(),
  title: z.string(),
  createdAt: isoDate,
  closedAt: isoDate.nullable(),
  updatedAt: isoDate,
  cls: authorClass,
  author: z.string().nullable(),
  firstResponseAt: isoDate.nullable(),
  labels: z.array(z.string()),
  assignees: z.number().int().nonnegative(),
  linkedOpenPulls: z.number().int().nonnegative(),
  lastClaimAt: isoDate.nullable(),
  coreReplyAt: z.array(isoDate),
  coreActors: z.array(z.string()),
});
export type IssueSummary = z.infer<typeof issueSummary>;

export const repoFacts = z.object({
  owner: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  archived: z.boolean(),
  isFork: z.boolean(),
  license: z.string().nullable(),
  defaultBranch: z.string().nullable(),
  pushedAt: isoDate.nullable(),
  createdAt: isoDate,
  topics: z.array(z.string()),
  /** Bytes of code per language. */
  languages: z.record(z.string(), z.number()),
  frameworks: z.array(z.string()),
  commits90d: z.number().int().nonnegative().nullable(),
  releases365d: z.number().int().nonnegative().nullable(),
  lastReleaseAt: isoDate.nullable(),
  gettingStarted: z.object({
    contributing: z.boolean(),
    codeOfConduct: z.boolean(),
    issueTemplates: z.boolean(),
    devcontainer: z.boolean(),
    cla: z.enum(["cla", "dco", "none", "unknown"]),
    channels: z.array(
      z.object({
        kind: z.enum([
          "discord",
          "slack",
          "zulip",
          "matrix",
          "mailing-list",
          "gitter",
          "irc",
          "forum",
        ]),
        url: z.string(),
      }),
    ),
  }),
});
export type RepoFacts = z.infer<typeof repoFacts>;

/** Durable per-repo state: everything a later refresh needs to recompute without refetching. */
export const repoState = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  facts: repoFacts,
  pulls: z.array(pullSummary),
  issues: z.array(issueSummary),
  /** Items updated after this instant are fetched on the next refresh. */
  syncedAt: isoDate,
  /** Earliest creation date the stored history is complete from. */
  coveredSince: isoDate,
  /** Accounts found to be automation from their behaviour, as lower-case logins. */
  bots: z.array(z.string()).default([]),
});
export type RepoState = z.infer<typeof repoState>;
