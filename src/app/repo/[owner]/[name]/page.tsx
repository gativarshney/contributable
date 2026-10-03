import type { Metadata } from "next";
import Link from "next/link";
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
import type { StarterIssue } from "@/core/metrics";
import type { IndexRow, RepoDetail } from "@/core/published";
import { getIndex, getRepoDetail } from "@/lib/data";
import {
  compact,
  count,
  date,
  dateTime,
  duration,
  NOT_ENOUGH,
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
  const missing = value === NOT_ENOUGH;
  return (
    <div className="card p-5">
      <h3 className="text-ink-2 text-sm">{label}</h3>
      <p
        className={
          missing
            ? "text-ink-3 mt-3 text-lg"
            : "num mt-2 text-[2.5rem] leading-none font-medium"
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
    <section id={id} className="border-hair scroll-mt-20 border-t py-10 md:py-12">
      <h2 className="font-display text-2xl">{title}</h2>
      {note ? <p className="text-ink-2 mt-2 max-w-2xl text-sm">{note}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

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
  const totalBytes = Object.values(facts.languages).reduce((a, b) => a + b, 0);
  const languages = Object.entries(facts.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const trendLabel = TREND_LABEL[detail.trend.flag];
  const alike = similar(index.rows, detail);

  return (
    <article className="shell py-10 md:py-14">
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

        <p className="mt-7 max-w-3xl text-[clamp(1.25rem,2.6vw,1.75rem)] leading-snug font-medium tracking-tight text-balance">
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
          <Link href={`/compare?repos=${id}`} className="btn btn-ghost">
            Compare
          </Link>
          {detail.programs.map((p) => (
            <Link key={p.slug} href={`/gsoc/${p.slug}`} className="tag !text-sm">
              GSoC {p.years.join(", ")}
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
          value={duration(reply.medianHours)}
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
        <WeeklyBars series={detail.series} />
      </Section>

      <Section
        id="issues"
        title="Starter issues"
        note="Issues labelled for beginners, with their real state. Available means open, unassigned, no linked pull request, nobody has claimed it in the last 14 days, and it was updated in the last 60 days."
      >
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(Object.keys(STATE_LABEL) as StarterIssue["state"][]).map((state) => (
            <div key={state}>
              <dt className={`text-sm ${STATE_LABEL[state][1]}`}>
                {STATE_LABEL[state][0]}
              </dt>
              <dd className="num mt-1 text-3xl font-medium">{starter.counts[state]}</dd>
            </div>
          ))}
        </dl>
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
          <p className="text-ink-2 mt-6 text-sm">
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

      <Section
        id="hours"
        title="When replies arrive"
        note="All maintainers counted together. Shown only when at least 3 people replied in the last 90 days, so it never describes one person."
      >
        {metrics.responseWindow.hours ? (
          <div className="max-w-3xl">
            <ReplyHours
              hours={metrics.responseWindow.hours}
              replies={metrics.responseWindow.replies}
              people={metrics.responseWindow.people}
            />
          </div>
        ) : (
          <p className="text-ink-2 text-sm">
            Not shown: fewer than 3 maintainers replied in the last 90 days.
          </p>
        )}
      </Section>

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
              <li key={label} className="flex items-center justify-between gap-4">
                <span>{label}</span>
                <span className={present ? "text-fast" : "text-ink-3"}>
                  {present ? "Yes" : "Not found"}
                </span>
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
        <div className="flex flex-wrap gap-2">
          {languages.map(([language, bytes]) => (
            <Link
              key={language}
              href={`/explore?lang=${encodeURIComponent(language)}`}
              className="tag !text-sm"
            >
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
        note="For maintainers: show these figures in your README. For contributors: follow new starter issues in a feed reader."
      >
        <div className="max-w-3xl space-y-4">
          {(["reply", "merge"] as const).map((metric) => {
            const markdown = `[![${metric === "reply" ? "First reply" : "Outside PRs merged"}](${SITE}/badge/${id}?metric=${metric})](${SITE}/repo/${id})`;
            return (
              <div key={metric} className="flex flex-wrap items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/badge/${id}?metric=${metric}`}
                  alt={
                    metric === "reply" ? "First reply badge" : "Outside PRs merged badge"
                  }
                  height={20}
                  className="h-5"
                />
                <code className="bg-bg-3 text-ink-2 min-w-0 flex-1 basis-64 truncate rounded-md px-2.5 py-1.5 text-xs">
                  {markdown}
                </code>
                <CopyButton text={markdown} label="Copy Markdown" />
              </div>
            );
          })}
          <p className="text-sm">
            <a href={`/feed/repo/${id}`} className="link">
              Atom feed of available starter issues
            </a>{" "}
            <span className="text-ink-3">
              · JSON at{" "}
              <a href={`/api/v1/repos/${id}`} className="link">
                /api/v1/repos/{id}
              </a>
            </span>
          </p>
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
