import { DAY_MS } from "@/lib/analysis/time";
import { buildReport, type Report } from "@/lib/report/run";
import type {
  Commit,
  Dataset,
  IssueItem,
  Release,
  StarterIssue,
  ThreadComment,
} from "@/types";

// A fixed instant and a seeded generator keep the example identical on every build.
const NOW = new Date("2026-09-28T12:00:00Z").getTime();
const FULL_NAME = "example-org/atlas-queue";
const URL_BASE = `https://github.com/${FULL_NAME}`;

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const AUTHORS: [string, number, boolean][] = [
  ["mira-okafor", 0.46, false],
  ["jonas-lindqvist", 0.66, false],
  ["priya-raman", 0.78, false],
  ["t-nakamura", 0.85, false],
  ["dependabot[bot]", 0.93, true],
  ["sam-whitlock", 0.97, false],
  ["Elena Varga", 1, false],
];

const TEAM = ["mira-okafor", "jonas-lindqvist", "priya-raman"];
const LABELS = [
  ["bug"],
  ["enhancement"],
  ["documentation"],
  ["bug", "postgres"],
  [],
  ["enhancement", "worker"],
  ["dependencies"],
];

const at = (daysAgo: number, hours = 0) =>
  new Date(NOW - daysAgo * DAY_MS - hours * 3_600_000).toISOString();

export function buildSampleDataset(): Dataset {
  const random = seeded(42);

  const commits: Commit[] = [];
  for (let d = 0; d < 90; d++) {
    const weekend = [0, 6].includes(new Date(NOW - d * DAY_MS).getUTCDay());
    const n = Math.floor(random() * (weekend ? 2 : 6));
    for (let i = 0; i < n; i++) {
      const roll = random();
      const [author, , isBot] = AUTHORS.find(([, limit]) => roll < limit)!;
      const sha = Math.floor(random() * 0xffffffff)
        .toString(16)
        .padStart(8, "0");
      commits.push({
        sha,
        date: at(d, 1 + i * 2),
        author,
        login: author.includes(" ") ? null : author,
        isBot,
        url: `${URL_BASE}/commit/${sha}`,
      });
    }
  }

  const releases: Release[] = Array.from({ length: 14 }, (_, i) => ({
    tag: `v2.${14 - i}.0`,
    publishedAt: at(9 + i * 24 + Math.floor(random() * 9)),
    prerelease: false,
    url: `${URL_BASE}/releases`,
  }));

  const issues: IssueItem[] = [];
  for (let n = 0; n < 150; n++) {
    const isPullRequest = random() < 0.6;
    const created = random() * 88;
    const resolved = random() < (isPullRequest ? 0.85 : 0.6);
    const closedDaysAgo = Math.max(0.1, created - random() * (isPullRequest ? 5 : 20));
    issues.push({
      number: 1840 - n,
      title: isPullRequest ? "Example pull request" : "Example issue",
      isPullRequest,
      createdAt: at(created),
      closedAt: resolved ? at(closedDaysAgo) : null,
      mergedAt: resolved && isPullRequest && random() < 0.88 ? at(closedDaysAgo) : null,
      author: AUTHORS[Math.floor(random() * AUTHORS.length)][0],
      association: "community",
      labels: LABELS[n % LABELS.length],
      url: URL_BASE,
    });
  }
  for (const issue of issues) {
    if (TEAM.includes(issue.author!)) issue.association = "team";
    else if (issue.author!.endsWith("[bot]")) issue.association = "bot";
    // Not every outside contribution lands: close some community pull requests unmerged.
    else if (issue.isPullRequest && issue.closedAt && issue.number % 4 === 0) {
      issue.mergedAt = null;
    }
  }

  // Most community threads get a reply from the team within a couple of days.
  const comments: ThreadComment[] = [];
  for (const issue of issues) {
    if (issue.association !== "community" || random() < 0.14) continue;
    const created = (NOW - new Date(issue.createdAt).getTime()) / DAY_MS;
    const delayDays = 0.05 + random() * random() * 3;
    if (created - delayDays <= 0) continue;
    comments.push({
      issueNumber: issue.number,
      createdAt: at(created - delayDays),
      author: TEAM[Math.floor(random() * TEAM.length)],
      association: "team",
    });
  }

  const starterIssues: StarterIssue[] = [
    ["Document retry backoff options", 6, 3, false, "good first issue"],
    ["Add example for scheduled jobs", 15, 1, false, "good first issue"],
    ["Clearer error when the database URL is missing", 22, 4, true, "good first issue"],
    ["Support custom logger in worker options", 31, 7, false, "help wanted"],
    ["Flaky test: concurrency limit under load", 48, 5, false, "help wanted"],
    ["Expose queue depth as a metric", 64, 9, true, "help wanted"],
    ["Typo fixes in migration guide", 9, 0, false, "good first issue"],
  ].map(([title, age, replies, assigned, label], i) => ({
    number: 1790 - i * 7,
    title: title as string,
    url: URL_BASE,
    createdAt: at(age as number),
    comments: replies as number,
    assigned: assigned as boolean,
    label: label as string,
  }));

  const since = at(90);
  return {
    repository: {
      owner: "example-org",
      name: "atlas-queue",
      fullName: FULL_NAME,
      description: "A durable job queue for Node.js services, backed by Postgres.",
      url: URL_BASE,
      language: "TypeScript",
      stars: 8420,
      forks: 512,
      openIssuesAndPulls: 96,
      license: "MIT",
      topics: ["queue", "postgres", "nodejs", "background-jobs"],
      defaultBranch: "main",
      createdAt: "2021-03-14T09:30:00Z",
      pushedAt: at(0, 3),
      archived: false,
      fork: false,
    },
    commits: { status: "ok", items: commits, complete: true, coveredSince: since },
    contributors: {
      status: "ok",
      complete: true,
      coveredSince: null,
      items: [
        { login: "mira-okafor", contributions: 1284, isBot: false },
        { login: "jonas-lindqvist", contributions: 611, isBot: false },
        { login: "priya-raman", contributions: 240, isBot: false },
        ...Array.from({ length: 44 }, (_, i) => ({
          login: `contributor-${i + 1}`,
          contributions: Math.max(1, 60 - i * 2),
          isBot: false,
        })),
      ],
    },
    releases: { status: "ok", items: releases, complete: true, coveredSince: null },
    issues: { status: "ok", items: issues, complete: true, coveredSince: since },
    comments: { status: "ok", items: comments, complete: true, coveredSince: since },
    starterIssues: {
      status: "ok",
      items: starterIssues,
      complete: true,
      coveredSince: null,
    },
    community: {
      readme: URL_BASE,
      contributing: URL_BASE,
      codeOfConduct: URL_BASE,
      license: URL_BASE,
      issueTemplate: URL_BASE,
      pullRequestTemplate: null,
    },
    languages: { TypeScript: 812_400, JavaScript: 61_200, PLpgSQL: 38_900, Shell: 9_100 },
    openPullRequests: 23,
    fetchedAt: new Date(NOW).toISOString(),
  };
}

export function buildSampleReport(): Report {
  return { ...buildReport(buildSampleDataset()), sample: true };
}
