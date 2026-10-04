import type { Metadata } from "next";
import Link from "next/link";
import { JumpBar } from "@/components/site/JumpBar";
import {
  Funnel,
  PositionStrip,
  ReplyCurve,
  WeeklyBars,
  answeredBy,
} from "@/components/data/charts";
import { RepoCard } from "@/components/data/RepoList";
import { ReplyHours } from "@/components/data/ReplyHours";
import { ReportLoader } from "@/components/report/ReportLoader";
import { CopyButton } from "@/components/site/CopyButton";
import { SaveButton } from "@/components/site/Saved";
import type { StarterIssue } from "@/core/metrics";
import type { IndexRow, RepoDetail } from "@/core/published";
import { getIndex, getRepoDetail } from "@/lib/data";
import {
  compact,
  count,
  date,
  dateTime,
  duration,
  firstReply,
  NOT_ENOUGH,
  UNANSWERED,
  percent,
  TREND_LABEL,
} from "@/lib/format";
import { verdict, verdictLine } from "@/lib/repo/verdict";

type Props = { params: Promise<{ owner: string; name: string }> };

export const revalidate = 900;

const SITE = "https://contributable.vercel.app";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, name } = await params;
  const detail = await getRepoDetail(owner, name);
  if (!detail) {
    return {
      title: `${owner}/${name}`,
      description: `How ${owner}/${name} treats outside contributors.`,
      robots: { index: false, follow: true },
    };
  }
  const id = `${detail.owner}/${detail.name}`;
  return {
    title: `${id}: reply time and merge rate for outside contributors`,
    description: verdictLine(detail),
    alternates: { canonical: `/repo/${id}` },
    openGraph: { title: id, description: verdictLine(detail), url: `/repo/${id}` },
  };
}

function Evidence({
  repo,
  numbers,
  kind,
  label,
}: {
  repo: string;
  numbers: number[];
  kind: "pull" | "issues";
  label: string;
}) {
  if (numbers.length === 0) return null;
  return (
    <details className="mt-3 text-xs">
      <summary className="text-ink-2 hover:text-ink cursor-pointer">
        {label} ({numbers.length})
      </summary>
      <p className="num mt-2 flex flex-wrap gap-x-2.5 gap-y-1">
        {numbers.map((n) => (
          <a
            key={n}
            href={`https://github.com/${repo}/${kind}/${n}`}
            className="link"
            rel="noreferrer"
            target="_blank"
          >
            #{n}
          </a>
        ))}
      </p>
    </details>
  );
}

function Tile({
  label,
  value,
  sample,
  children,
}: {
  label: string;
  value: string;
  sample: string;
  children?: React.ReactNode;
}) {
  const missing = value === NOT_ENOUGH || value === UNANSWERED;
  return (
    <div className="card p-5">
      <h2 className="text-ink-2 text-sm font-normal">{label}</h2>
      <p
        className={
          missing
            ? "text-ink-3 mt-3 text-lg"
            : "num mt-3 text-[2.75rem] leading-none font-medium tracking-tight"
        }
      >
        {value}
      </p>
      <p className="text-ink-3 num mt-2 text-xs">{sample}</p>
      {children}
    </div>
  );
}

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card mt-6 p-6 md:p-8">
      <div className="flex items-start gap-4">
        {SECTION_ICONS[id] ? (
          <span className="border-accent/40 bg-accent-soft/40 text-accent grid size-10 shrink-0 place-items-center rounded-full border">
            <svg
              viewBox="0 0 24 24"
              className="size-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={SECTION_ICONS[id]} />
            </svg>
          </span>
        ) : null}
        <div>
          <h2 className="font-display text-2xl">{title}</h2>
          {note ? <p className="text-ink-2 mt-1.5 max-w-2xl text-sm">{note}</p> : null}
        </div>
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

/** One small picture per section, so the page can be scanned by eye. */
const SECTION_ICONS: Record<string, string> = {
  "first-steps": "M6 4l14 8-14 8z",
  funnel: "M3 5h18l-7 8v6l-4 2v-8z",
  trend: "M4 19V9m5 10V5m5 14v-7m5 7v-4",
  issues: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
  hours: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  start: "M5 12.5 10 17 19 7",
  stack: "M12 3 3 8l9 5 9-5zM3 13l9 5 9-5",
  share: "M4 12v7h16v-7M12 3v12m-4-4 4 4 4-4",
  similar: "M8 4h12v12M4 8h12v12H4z",
};

/** Colours for the language bar, in order of share. */
const LANGUAGE_COLOURS = [
  "var(--accent)",
  "var(--cat-1)",
  "var(--cat-4)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--ink-3)",
];

const STATE_LABEL: Record<StarterIssue["state"], [string, string]> = {
  available: ["Available", "text-fast"],
  claimed: ["Claimed", "text-slow"],
  "in-progress": ["Has a pull request", "text-merged"],
  stale: ["Stale", "text-stale"],
};

const CLA_TEXT: Record<RepoDetail["facts"]["gettingStarted"]["cla"], string> = {
  cla: "A contributor licence agreement must be signed before a pull request is merged.",
  dco: "Commits must be signed off (DCO): use git commit -s.",
  none: "No CLA or sign-off requirement was found.",
  unknown: "Could not tell whether a CLA or sign-off is required.",
};

interface FirstStep {
  title: string;
  text: string;
  action?: string;
  href?: string;
}

/** What a newcomer should do at this repository, from what was found in it. */
function firstSteps(detail: RepoDetail, id: string): FirstStep[] {
  const { facts, metrics } = detail;
  const start = facts.gettingStarted;
  const issue = metrics.starter.issues.find(
    (i) => i.state === "available" && i.label === "beginner",
  );
  const channel = start.channels[0];
  const reply = metrics.pullFirstResponse.medianHours;
  const steps: FirstStep[] = [
    start.contributing
      ? {
          title: "Read the contributing guide",
          text: "It says how to set the project up and what the maintainers expect in a pull request.",
          action: "Open the guide",
          href: `https://github.com/${id}/contribute`,
        }
      : {
          title: "Read the README",
          text: "No contributing guide was found, so the README is where setup is explained.",
          action: "Open the README",
          href: `https://github.com/${id}#readme`,
        },
    issue
      ? {
          title: "Take this free issue",
          text: issue.title,
          action: `Open issue #${issue.n}`,
          href: `https://github.com/${id}/issues/${issue.n}`,
        }
      : {
          title: "Find something small",
          text: "No first issue is free right now. Look for a typo, a missing test or an unclear error message, or ask where help is wanted.",
          action: "Browse open issues",
          href: `https://github.com/${id}/issues`,
        },
    channel
      ? {
          title: "Know where to ask",
          text: `Questions go to the project's ${channel.kind.replace("-", " ")}, or on the issue itself. Not in private messages.`,
          action: "Open it",
          href: channel.url,
        }
      : {
          title: "Know where to ask",
          text: "No chat was found. Ask on the issue you are working on; that is where maintainers look.",
        },
  ];
  if (start.cla === "cla" || start.cla === "dco") {
    steps.push({
      title:
        start.cla === "cla" ? "Sign the contributor agreement" : "Sign off your commits",
      text:
        start.cla === "cla"
          ? "A bot will ask you to sign a contributor licence agreement on your first pull request. It takes a minute."
          : "Commit with git commit -s. Without the sign-off line the checks fail.",
    });
  }
  steps.push({
    title: "Open a small pull request",
    text:
      reply !== null
        ? `Link the issue in it. A first reply here usually takes ${duration(reply)}; until then, silence is normal.`
        : "Link the issue in it. Too few outside pull requests here to say how long a reply takes.",
  });
  return steps;
}

function similar(rows: IndexRow[], detail: RepoDetail): IndexRow[] {
  const id = `${detail.owner}/${detail.name}`.toLowerCase();
  const me = rows.find((r) => r.id.toLowerCase() === id);
  if (!me || me.lang.length === 0) return [];
  return rows
    .filter((r) => r.id !== me.id && r.lang[0] === me.lang[0] && r.replyHours !== null)
    .map((r) => ({
      row: r,
      // Shared frameworks and topics first, then the faster reply.
      shared:
        r.fw.filter((f) => me.fw.includes(f)).length +
        r.topics.filter((t) => me.topics.includes(t)).length,
    }))
    .sort((a, b) => b.shared - a.shared || a.row.replyHours! - b.row.replyHours!)
    .slice(0, 3)
    .map((x) => x.row);
}

export default async function RepoPage({ params }: Props) {
  const { owner, name } = await params;
  const detail = await getRepoDetail(owner, name);

  // Not in the index: measure it on the spot instead of sending the visitor away.
  if (!detail) {
    return (
      <ReportLoader owner={decodeURIComponent(owner)} name={decodeURIComponent(name)} />
    );
  }

  const index = await getIndex();
  const id = `${detail.owner}/${detail.name}`;
  const { metrics, facts } = detail;
  const cohort = metrics.outsidePulls.cohort;
  const first = metrics.outsidePulls.firstTimers;
  const reply = metrics.pullFirstResponse;
  const issueReply = metrics.issueFirstResponse;
  const starter = metrics.starter;
  const beginner = starter.issues.filter((i) => i.label === "beginner");
  const starterTotal = Object.values(starter.counts).reduce((a, b) => a + b, 0);
  const steps = firstSteps(detail, id);
  const totalBytes = Object.values(facts.languages).reduce((a, b) => a + b, 0);
  const languages = Object.entries(facts.languages)
    .sort((a, b) => b[1] - a[1])
    .filter(([, bytes]) => bytes / totalBytes >= 0.01)
    .slice(0, 6);
  const trendLabel = TREND_LABEL[detail.trend.flag];
  const alike = similar(index.rows, detail);
  const jumps = [
    { id: "first-steps", label: "First steps" },
    { id: "funnel", label: "Pull requests" },
    { id: "trend", label: "52 weeks" },
    { id: "issues", label: "Starter issues" },
    ...(metrics.responseWindow.hours ? [{ id: "hours", label: "Reply hours" }] : []),
    { id: "start", label: "How to start" },
    { id: "stack", label: "Stack" },
    { id: "share", label: "Badge and feed" },
    ...(alike.length > 0 ? [{ id: "similar", label: "Similar" }] : []),
  ];

  return (
    <article className="page-glow shell py-10 md:py-14">
      <header>
        <nav aria-label="Breadcrumb" className="text-ink-3 text-sm">
          <Link href="/explore" className="hover:text-ink">
            Explore
          </Link>{" "}
          / <span className="text-ink-2">{id}</span>
        </nav>
        <h1 className="display mt-4 text-[clamp(1.9rem,5vw,3.25rem)] break-words">
          <span className="text-ink-2">{detail.owner}/</span>
          {detail.name}
        </h1>
        {facts.description ? (
          <p className="text-ink-2 mt-3 max-w-2xl">{facts.description}</p>
        ) : null}

        <p className="eyebrow !text-accent mt-9">In plain words</p>
        <p className="display mt-3 max-w-4xl text-[clamp(1.5rem,3.4vw,2.4rem)] !leading-[1.15]">
          {verdict(detail).join(" ")}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <a
            href={`https://github.com/${id}`}
            className="btn"
            target="_blank"
            rel="noreferrer"
          >
            Open on GitHub
          </a>
          <SaveButton id={id} />
          <Link href={`/compare?repos=${id}`} className="btn btn-ghost">
            Compare
          </Link>
          {detail.programs.map((p) => (
            <Link key={p.slug} href={`/gsoc/${p.slug}`} className="tag !text-sm">
              Google Summer of Code {p.years.join(", ")}
            </Link>
          ))}
          <span className="text-ink-3 num ml-1 text-xs">
            Updated {dateTime(detail.updatedAt)} · {compact(facts.stars)} stars
          </span>
        </div>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Outside PRs merged"
          value={percent(cohort.mergeRate)}
          sample={`${cohort.merged} merged, ${cohort.closedUnmerged} closed, ${cohort.open} still open`}
        >
          <PositionStrip
            kind="share"
            label="Outside merge rate"
            value={cohort.mergeRate}
            values={index.rows.flatMap((r) =>
              r.mergeRate === null ? [] : [r.mergeRate],
            )}
          />
          <Evidence
            repo={id}
            kind="pull"
            numbers={cohort.evidence.merged}
            label="Merged"
          />
          <Evidence
            repo={id}
            kind="pull"
            numbers={cohort.evidence.closedUnmerged}
            label="Closed without merging"
          />
        </Tile>
        <Tile
          label="First human reply"
          value={firstReply(reply.medianHours, reply.n)}
          sample={`median of ${reply.n} outside PRs, ${reply.waiting} unanswered`}
        >
          <PositionStrip
            kind="hours"
            label="First reply time"
            value={reply.medianHours}
            values={index.rows.flatMap((r) =>
              r.replyHours === null ? [] : [r.replyHours],
            )}
          />
          <Evidence
            repo={id}
            kind="pull"
            numbers={reply.evidence.waiting}
            label="Still unanswered"
          />
        </Tile>
        <Tile
          label="Time to merge"
          value={duration(metrics.timeToMerge.medianHours)}
          sample={`${metrics.timeToMerge.merged} of ${metrics.timeToMerge.n} outside PRs merged`}
        >
          <Evidence
            repo={id}
            kind="pull"
            numbers={metrics.timeToMerge.evidence}
            label="Merged PRs"
          />
        </Tile>
        <Tile
          label="First-time contributors"
          value={percent(first.mergeRate)}
          sample={`merged: ${first.merged} of ${first.merged + first.closedUnmerged} decided first PRs`}
        >
          <Evidence
            repo={id}
            kind="pull"
            numbers={first.evidence.merged}
            label="Merged"
          />
        </Tile>
      </div>
      <p className="text-ink-3 mt-3 text-xs">
        Outside PRs opened 30 to 120 days ago, so each has had time to be answered. A
        figure needs at least 5 pull requests, otherwise it reads &quot;{NOT_ENOUGH}
        &quot;.{" "}
        <Link href="/methodology" className="link">
          How this is calculated
        </Link>
      </p>

      <JumpBar items={jumps} />

      <Section
        id="first-steps"
        title="Your first steps here"
        note="If you have never contributed to this project, do these in order."
      >
        <ol
          className={`grid gap-4 sm:grid-cols-2 ${steps.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
        >
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="border-hair bg-bg/40 flex flex-col rounded-xl border p-5"
            >
              <span className="bg-accent-soft text-accent num grid size-8 place-items-center rounded-full text-sm font-medium">
                {i + 1}
              </span>
              <h3 className="mt-4 font-medium">{step.title}</h3>
              <p className="text-ink-2 mt-1.5 flex-1 text-sm">{step.text}</p>
              {step.href ? (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  className="link mt-4 text-sm"
                >
                  {step.action}
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="funnel"
        title="What happens to an outside pull request"
        note="Every pull request opened by someone outside the core team, 30 to 120 days ago."
      >
        <div className="grid gap-10 lg:grid-cols-2">
          <Funnel opened={cohort.n} replied={reply.answered} merged={cohort.merged} />
          <div>
            <h3 className="text-sm font-medium">Time to first reply</h3>
            {reply.curve.length > 0 ? (
              <>
                <p className="text-ink-2 mt-1 mb-3 text-sm">
                  After 2 days, {percent(answeredBy(reply.curve, 48))} of outside PRs had
                  a reply from a person. After a week,{" "}
                  {percent(answeredBy(reply.curve, 168))}. Bots do not count.
                </p>
                <ReplyCurve curve={reply.curve} />
              </>
            ) : (
              <p className="text-ink-3 mt-2 text-sm">
                {NOT_ENOUGH}: fewer than 5 outside pull requests in the period.
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section
        id="trend"
        title="The last 52 weeks"
        note={
          trendLabel
            ? `${trendLabel}. Median first reply was ${duration(detail.trend.recentMedianHours)} over the last four weeks (${detail.trend.recentN} PRs) and ${duration(detail.trend.previousMedianHours)} over the four before (${detail.trend.previousN} PRs).`
            : "Outside pull requests opened each week, and how many of them have been merged."
        }
      >
        <div className="max-w-3xl">
          <WeeklyBars series={detail.series} />
        </div>
      </Section>

      <Section
        id="issues"
        title="Starter issues"
        note="Issues labelled for beginners, with their real state. Available means open, unassigned, no linked pull request, nobody has claimed it in the last 14 days, and it was updated in the last 60 days."
      >
        {starterTotal === 0 ? null : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(STATE_LABEL) as StarterIssue["state"][]).map((state) => (
              <div key={state} className="border-hair bg-bg/40 rounded-xl border p-4">
                <dt
                  className={`flex items-center gap-2 text-sm ${STATE_LABEL[state][1]}`}
                >
                  <span className="size-2 rounded-full bg-current" aria-hidden="true" />
                  {STATE_LABEL[state][0]}
                </dt>
                <dd className="num mt-2 text-4xl font-medium">{starter.counts[state]}</dd>
              </div>
            ))}
          </dl>
        )}
        {beginner.length > 0 ? (
          <ul className="border-hair mt-6 divide-y divide-[var(--hair)] rounded-2xl border">
            {beginner.slice(0, 12).map((issue) => (
              <li key={issue.n} className="flex items-baseline gap-3 px-4 py-3 text-sm">
                <span className={`w-36 shrink-0 text-xs ${STATE_LABEL[issue.state][1]}`}>
                  {STATE_LABEL[issue.state][0]}
                </span>
                <a
                  href={`https://github.com/${id}/issues/${issue.n}`}
                  target="_blank"
                  rel="noreferrer"
                  className="link min-w-0 flex-1 truncate"
                >
                  {issue.title}
                </a>
                <span className="text-ink-3 num shrink-0 text-xs">#{issue.n}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p
            className={`text-ink-2 text-sm ${starterTotal === 0 ? "border-hair bg-bg/40 rounded-xl border p-5" : "mt-6"}`}
          >
            No open issue carries a beginner label.
            {starter.helpWantedAvailable > 0
              ? ` ${starter.helpWantedAvailable} issues marked "help wanted" are available.`
              : ""}
          </p>
        )}
        <p className="text-ink-3 mt-3 text-xs">
          Issue replies: first human reply in {duration(issueReply.medianHours)} (median
          of {issueReply.n} issues).
        </p>
      </Section>

      {metrics.responseWindow.hours ? (
        <Section
          id="hours"
          title="When replies arrive"
          note="All maintainers counted together. Shown only when at least 3 people replied in the last 90 days, so it never describes one person."
        >
          <div className="max-w-3xl">
            <ReplyHours
              hours={metrics.responseWindow.hours}
              replies={metrics.responseWindow.replies}
              people={metrics.responseWindow.people}
            />
          </div>
        </Section>
      ) : null}

      <Section id="start" title="How to start">
        <div className="grid gap-8 md:grid-cols-2">
          <ul className="space-y-3 text-sm">
            {(
              [
                ["Contributing guide", facts.gettingStarted.contributing],
                ["Code of conduct", facts.gettingStarted.codeOfConduct],
                ["Issue templates", facts.gettingStarted.issueTemplates],
                ["Dev container for one-step setup", facts.gettingStarted.devcontainer],
              ] as const
            ).map(([label, present]) => (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${
                    present
                      ? "bg-accent text-accent-ink"
                      : "border-hair-strong text-ink-3 border"
                  }`}
                  aria-hidden="true"
                >
                  {present ? "✓" : "–"}
                </span>
                <span className={present ? "" : "text-ink-3"}>{label}</span>
                <span className="sr-only">{present ? "found" : "not found"}</span>
              </li>
            ))}
            <li className="text-ink-2 border-hair border-t pt-3">
              {CLA_TEXT[facts.gettingStarted.cla]}
            </li>
          </ul>
          <div className="text-sm">
            <h3 className="font-medium">Where the project talks</h3>
            {facts.gettingStarted.channels.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {facts.gettingStarted.channels.map((channel) => (
                  <li key={channel.url}>
                    <a
                      href={channel.url}
                      target="_blank"
                      rel="noreferrer"
                      className="tag !text-sm capitalize"
                    >
                      {channel.kind.replace("-", " ")}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-2 mt-2">
                No chat or mailing list link was found in the README or contributing
                guide.
              </p>
            )}
            <h3 className="mt-6 font-medium">Activity</h3>
            <dl className="num text-ink-2 mt-3 grid grid-cols-2 gap-y-2">
              <dt>Commits, 90 days</dt>
              <dd className="text-ink text-right">
                {facts.commits90d === null ? "n/a" : count(facts.commits90d)}
              </dd>
              <dt>Releases, 12 months</dt>
              <dd className="text-ink text-right">{facts.releases365d ?? "n/a"}</dd>
              <dt>Active maintainers</dt>
              <dd className="text-ink text-right">{metrics.activeMaintainers}</dd>
              <dt>Last push</dt>
              <dd className="text-ink text-right">
                {facts.pushedAt ? date(facts.pushedAt) : "n/a"}
              </dd>
            </dl>
          </div>
        </div>
      </Section>

      <Section id="stack" title="Stack">
        <div
          className="flex h-3 overflow-hidden rounded-full"
          role="img"
          aria-label={languages
            .map(([language, bytes]) => `${language} ${percent(bytes / totalBytes)}`)
            .join(", ")}
        >
          {languages.map(([language, bytes], i) => (
            <span
              key={language}
              style={{
                width: `${(bytes / totalBytes) * 100}%`,
                background: LANGUAGE_COLOURS[i % LANGUAGE_COLOURS.length],
              }}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {languages.map(([language, bytes], i) => (
            <Link
              key={language}
              href={`/explore?lang=${encodeURIComponent(language)}`}
              className="tag !text-sm"
            >
              <span
                className="size-2 rounded-full"
                style={{ background: LANGUAGE_COLOURS[i % LANGUAGE_COLOURS.length] }}
                aria-hidden="true"
              />
              {language}
              <span className="num text-ink-3">{percent(bytes / totalBytes)}</span>
            </Link>
          ))}
          {facts.frameworks.map((framework) => (
            <Link
              key={framework}
              href={`/explore?fw=${encodeURIComponent(framework)}`}
              className="tag !text-sm"
            >
              {framework}
            </Link>
          ))}
        </div>
      </Section>

      <Section
        id="share"
        title="Badge and feed"
        note="Two ways to use these figures outside this page."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border-hair bg-bg/40 min-w-0 rounded-xl border p-5">
            <h3 className="font-medium">For maintainers: a README badge</h3>
            <p className="text-ink-2 mt-1 text-sm">
              Shows newcomers how quickly this project answers and how often it merges.
              Paste the line into your README; the badge updates with the index.
            </p>
            <div className="mt-4 space-y-4">
              {(["reply", "merge"] as const).map((metric) => {
                const markdown = `[![${metric === "reply" ? "First reply" : "Outside PRs merged"}](${SITE}/badge/${id}?metric=${metric})](${SITE}/repo/${id})`;
                return (
                  <div key={metric}>
                    <div className="flex items-center justify-between gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/badge/${id}?metric=${metric}`}
                        alt={
                          metric === "reply"
                            ? "First reply badge"
                            : "Outside PRs merged badge"
                        }
                        height={20}
                        className="h-5"
                      />
                      <CopyButton text={markdown} label="Copy Markdown" />
                    </div>
                    <pre className="bg-bg-3 text-ink-2 mt-2 overflow-x-auto rounded-md px-3 py-2 text-xs">
                      <code>{markdown}</code>
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-hair bg-bg/40 min-w-0 rounded-xl border p-5">
            <h3 className="font-medium">For contributors: follow new issues</h3>
            <p className="text-ink-2 mt-1 text-sm">
              Add the feed to a feed reader (Feedly, Inoreader, Thunderbird) and you hear
              about new free starter issues here without checking the site.
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm">Atom feed of free starter issues</span>
              <CopyButton text={`${SITE}/feed/repo/${id}`} label="Copy feed link" />
            </div>
            <pre className="bg-bg-3 text-ink-2 mt-2 overflow-x-auto rounded-md px-3 py-2 text-xs">
              <code>{`${SITE}/feed/repo/${id}`}</code>
            </pre>
            <p className="text-ink-3 mt-4 text-xs">
              For developers: every figure on this page as JSON at{" "}
              <a href={`/api/v1/repos/${id}`} className="link break-all">
                /api/v1/repos/{id}
              </a>
              .
            </p>
          </div>
        </div>
      </Section>

      {alike.length > 0 ? (
        <Section
          id="similar"
          title="Similar repositories"
          note={`Same main language (${alike[0].lang[0]}), most shared frameworks and topics first, then the faster reply.`}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alike.map((row) => (
              <RepoCard key={row.id} row={row} />
            ))}
          </div>
        </Section>
      ) : null}
    </article>
  );
}
