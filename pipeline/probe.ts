/**
 * Phase 1 probe. Runs against the live API with the sweep token and writes:
 *   out/probe/summary.json   points per backfill and per incremental refresh, per repo
 *   out/probe/association.json   how authorAssociation behaves on merged pull requests
 *   out/probe/fixtures/<owner>__<name>.json   recorded GraphQL responses for golden tests
 *
 *   SWEEP_GITHUB_TOKEN=... npx tsx pipeline/probe.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "../src/core/github/client";
import { fetchRepo } from "../src/core/github/fetch";
import { computeMetrics } from "../src/core/metrics";

// Varied on purpose: sizes, languages, review tooling (Prow, bors, CLA bots), and quiet repos.
export const PROBE_REPOS = [
  "kubernetes/minikube",
  "kubernetes-sigs/kind",
  "rust-lang/rust-clippy",
  "pytorch/vision",
  "llvm/llvm-project",
  "django/django",
  "pallets/flask",
  "numpy/numpy",
  "sympy/sympy",
  "zulip/zulip",
  "OpenPrinting/cups",
  "facebook/docusaurus",
  "vercel/swr",
  "withastro/astro",
  "golang/vscode-go",
  "spf13/cobra",
  "apache/datafusion",
  "ankidroid/Anki-Android",
  "godotengine/godot-docs",
  "sktime/sktime",
  "fossasia/visdom",
  "gativarshney/contributable",
];

const HASH_KEY = "probe";
const DAY_MS = 86_400_000;

interface Recorded {
  variables: unknown;
  query: string;
  response: unknown;
}

function recordingFetch(sink: Recorded[]): typeof fetch {
  return async (input, init) => {
    const response = await fetch(input, init);
    const clone = response.clone();
    try {
      const request = JSON.parse(String(init?.body ?? "{}")) as {
        query: string;
        variables: unknown;
      };
      const name = /query\s+(\w+)/.exec(request.query)?.[1] ?? "unknown";
      sink.push({
        query: name,
        variables: request.variables,
        response: await clone.json(),
      });
    } catch {
      // A response that is not JSON is not worth keeping.
    }
    return response;
  };
}

async function associationExperiment(token: string) {
  // Outside pull requests, open and merged, with GitHub's association for each.
  const query = `
query Association($q: String!) {
  search(query: $q, type: ISSUE, first: 100) {
    nodes { ... on PullRequest { number state merged authorAssociation repository { nameWithOwner } } }
  }
}`;
  const client = createClient({ token });
  const tally = async (q: string) => {
    const data = await client.query<{
      search: { nodes: { merged?: boolean; authorAssociation?: string }[] };
    }>(query, { q });
    const counts: Record<string, number> = {};
    for (const node of data.search.nodes) {
      const key = node.authorAssociation ?? "unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  };
  const since = new Date(Date.now() - 14 * DAY_MS).toISOString().slice(0, 10);
  return {
    question: "Does FIRST_TIME_CONTRIBUTOR survive on merged pull requests?",
    open: await tally(`is:pr is:open is:public created:>${since} sort:created-desc`),
    merged: await tally(`is:pr is:merged is:public created:>${since} sort:created-desc`),
    closedUnmerged: await tally(
      `is:pr is:unmerged is:closed is:public created:>${since} sort:created-desc`,
    ),
    points: client.budget.spent,
  };
}

async function main() {
  const token = (process.env.SWEEP_GITHUB_TOKEN ?? "").trim();
  if (!token) throw new Error("SWEEP_GITHUB_TOKEN is not set");
  const out = join(process.cwd(), "out", "probe");
  mkdirSync(join(out, "fixtures"), { recursive: true });

  const rows: Record<string, unknown>[] = [];
  for (const full of PROBE_REPOS) {
    const [owner, name] = full.split("/");
    const row: Record<string, unknown> = { repo: full };
    try {
      // Backfill, measured.
      const backfillClient = createClient({ token });
      const started = Date.now();
      const state = await fetchRepo(backfillClient, owner, name, { hashKey: HASH_KEY });
      row.backfillPoints = backfillClient.budget.spent;
      row.backfillCalls = backfillClient.budget.calls;
      row.backfillSeconds = Math.round((Date.now() - started) / 1000);
      row.pulls = state.pulls.length;
      row.issues = state.issues.length;
      row.remaining = backfillClient.budget.last?.remaining ?? null;

      // Incremental refresh as the weekly sweep would see it: last sync seven days ago.
      const weekAgo = {
        ...state,
        syncedAt: new Date(Date.now() - 7 * DAY_MS).toISOString(),
      };
      const weekly = createClient({ token });
      await fetchRepo(weekly, owner, name, { hashKey: HASH_KEY }, weekAgo);
      row.weeklyPoints = weekly.budget.spent;
      row.weeklyCalls = weekly.budget.calls;

      // And as the two-day Tier 1 refresh would see it.
      const twoDays = {
        ...state,
        syncedAt: new Date(Date.now() - 2 * DAY_MS).toISOString(),
      };
      const frequent = createClient({ token });
      await fetchRepo(frequent, owner, name, { hashKey: HASH_KEY }, twoDays);
      row.twoDayPoints = frequent.budget.spent;

      const metrics = computeMetrics(state.pulls, state.issues, new Date());
      row.cohortN = metrics.outsidePulls.cohort.n;
      row.mergeRate = metrics.outsidePulls.cohort.mergeRate;
      row.medianReplyHours = metrics.pullFirstResponse.medianHours;
      row.starter = metrics.starter.counts;
      row.classes = state.pulls.reduce<Record<string, number>>((acc, p) => {
        acc[p.cls] = (acc[p.cls] ?? 0) + 1;
        return acc;
      }, {});

      // A small recording for golden tests: two pages per list is enough to exercise the mapping.
      const recorded: Recorded[] = [];
      const recorder = createClient({ token, fetchImpl: recordingFetch(recorded) });
      const recordedAt = new Date();
      await fetchRepo(recorder, owner, name, {
        hashKey: HASH_KEY,
        now: recordedAt,
        maxPages: 2,
      });
      writeFileSync(
        join(out, "fixtures", `${owner}__${name}.json`),
        JSON.stringify({
          repo: full,
          recordedAt: recordedAt.toISOString(),
          calls: recorded,
        }),
      );
    } catch (error) {
      row.error =
        error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
    rows.push(row);
    console.log(JSON.stringify(row));
  }

  const ok = rows.filter((r) => typeof r.weeklyPoints === "number");
  const mean = (key: string) =>
    ok.length ? ok.reduce((sum, r) => sum + (r[key] as number), 0) / ok.length : null;
  const summary = {
    measuredAt: new Date().toISOString(),
    repos: rows.length,
    succeeded: ok.length,
    meanBackfillPoints: mean("backfillPoints"),
    meanWeeklyPoints: mean("weeklyPoints"),
    meanTwoDayPoints: mean("twoDayPoints"),
    gate: "mean incremental refresh <= 15 points",
    rows,
  };
  writeFileSync(join(out, "summary.json"), JSON.stringify(summary, null, 1));
  writeFileSync(
    join(out, "association.json"),
    JSON.stringify(await associationExperiment(token), null, 1),
  );
  console.log(
    `mean points: backfill ${summary.meanBackfillPoints}, weekly ${summary.meanWeeklyPoints}, two-day ${summary.meanTwoDayPoints}`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
