import type { Metadata } from "next";
import { PageMark } from "@/components/site/Drift";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology and limitations",
  description:
    "How Contributable reads public GitHub data, calculates its metrics, and what the numbers cannot tell you.",
};

const steps = [
  [
    "Read",
    "Repository metadata, default-branch commits, contributors, releases, issues and pull requests are requested from GitHub's public REST API.",
  ],
  [
    "Calculate",
    "Pure functions turn that data into figures over the last 90 days, or the longest recent period that could be read in full. The same data always produces the same report.",
  ],
  [
    "Show the evidence",
    "Every number carries the inputs it came from, the formula, what it suggests and what it does not prove.",
  ],
];

const rules = [
  [
    "No composite score",
    "Signals are never rolled into one health number. There is no defensible way to weigh them for every project.",
  ],
  [
    "Stated thresholds",
    "Every yes or no on the checklist comes from one fixed rule, and the report prints that rule.",
  ],
  [
    "Deterministic",
    "No language model writes any part of a report. Answers come from fixed rules over calculated figures.",
  ],
  [
    "Honest coverage",
    "Very busy repositories cannot be read in full. A partial count can prove a yes, because it is a lower bound, but never a no. Anything else is marked not enough data.",
  ],
];

const contributorSignals = [
  [
    "Where to start",
    "Open issues labelled good first issue or help wanted that nobody is assigned to. Finding a first task is the barrier newcomers report most.",
  ],
  [
    "Will it be merged",
    "The share of pull requests from outside the team that were merged rather than closed, and how long merging took.",
  ],
  [
    "Will anyone reply",
    "The median wait for a first reply from another person. Bot comments never count, because bots often reply first.",
  ],
  [
    "Is the process written down",
    "Whether GitHub detects a README, contributing guide, code of conduct, licence and templates.",
  ],
];

const definitions = [
  [
    "Outside contributor",
    "The author of a pull request whom GitHub does not mark as owner, member or collaborator of the repository, and who is not a bot. Everyone GitHub marks that way is counted as the core team.",
  ],
  [
    "The cohort",
    "Pull requests opened 30 to 120 days ago. Newer ones have not had time to be answered or merged, so including them would make every project look worse than it is.",
  ],
  [
    "Outside merge rate",
    "Merged, divided by merged plus closed without merging, for outside pull requests in the cohort. Pull requests still open are counted separately and shown next to it.",
  ],
  [
    "First-time contributors",
    "The same merge rate for pull requests that are their author's first in the stored year of history.",
  ],
  [
    "First reply time",
    "Hours from opening to the first comment, review or review comment by a person other than the author, or to a merge by someone else if that comes first. Bots never count. A pull request nobody answered stays in the calculation as still waiting, so the median and the shares within 48 hours and 7 days get worse when pull requests are ignored. If more than half were never answered there is no median.",
  ],
  [
    "Time to merge",
    "The median time from opening to merging. A pull request closed without merging counts as never merged rather than being dropped.",
  ],
  [
    "Starter issue states",
    "For open issues with a beginner label. In progress: an open pull request is linked. Claimed: someone is assigned, or a comment in the last 14 days asks to take it. Stale: no activity for 60 days. Available: none of those.",
  ],
  [
    "Reply hours",
    "Replies by core team members over 90 days, counted by weekday and hour, all people together. It is not published when fewer than 3 people replied, because it would then describe one person.",
  ],
  [
    "Trend",
    "Median first reply over the last four weeks against the four weeks before. Got faster or slowed down needs a change of at least 1.5 times and 5 pull requests in each period. Went quiet means no pull request and no core reply for four weeks.",
  ],
  [
    "GSoC ranking",
    "An organisation's figure pools its measured repositories, weighted by their number of outside pull requests. Organisations are ordered by the share answered within 7 days, then by outside merge rate. An organisation needs 20 outside pull requests to take a place in the ranking; smaller ones are listed after it with their figures.",
  ],
  [
    "Which repositories",
    "For every GSoC organisation from 2024 to 2026 that is on GitHub: up to 12 of its most starred repositories that are not forks, archives or mirrors, had a push in the last 180 days and have at least 5 pull requests.",
  ],
  [
    "Sample size",
    "Every figure shows the number of pull requests or issues behind it. Under 5 it reads Not enough data. Each figure links to the pull requests it counted.",
  ],
];

const indexLimits = [
  "Bots are recognised by account type, by name, and by behaviour: an account that answers within a minute on most pull requests, or comments on over 60% of them within 15 minutes, is treated as automation. A bot that fits none of these still counts as a person and makes a project look faster than it is.",
  "GitHub only marks someone as a member when their membership is public. A core developer with private membership is counted as an outside contributor, which makes a project look more open to outsiders than it is.",
  "A reply from another outside contributor counts as a human reply. It is still an answer, but it is not a maintainer's.",
  "Projects that review on a mailing list, Gerrit or GitLab look silent here. Organisations that do not work on GitHub are listed as not measured instead of being ranked last.",
  "Claims are detected from comment wording, in English. A claim written differently is missed and the issue shows as available.",
  "At most 25 comments and 25 reviews are read per pull request. A first reply always falls within those; later ones matter only for reply hours.",
];

const limitations = [
  "Only public data is visible. Private forks, internal trackers and chat never show up.",
  "Commit metrics cover the default branch. Long-lived release branches are not included.",
  "Very active repositories exceed the collection limit; the report states the period it covers.",
  "Authorship follows GitHub attribution. Squash merges and unlinked emails blur who did the work.",
  "Projects that publish through tags or a package registry show no GitHub Releases.",
  "Response times see comments and merges; a pull request answered only by an approving review looks unanswered.",
  "Tone is not measured. Nothing here tells you whether a community is welcoming.",
  "Activity is not quality. A quiet repository can be finished; a busy one can be unstable.",
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-hair grid gap-6 border-t py-12 md:grid-cols-[220px_1fr] md:gap-12">
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <div className="page-glow shell pt-16 pb-24 md:pt-24">
      <div className="flex items-center gap-3">
        <PageMark icon="M4 20h16M7 16V10M12 16V5M17 16v-4" />
        <p className="eyebrow">Methodology</p>
      </div>
      <h1 className="display mt-5 max-w-3xl text-[clamp(2.4rem,6vw,4.25rem)]">
        Calculated, <em>not generated.</em>
      </h1>
      <p className="text-ink-2 mt-6 mb-14 max-w-2xl text-lg">
        What Contributable reads, how it turns that into numbers, and where those numbers
        stop being useful.
      </p>

      <Block title="How it works">
        <ol className="space-y-6">
          {steps.map(([title, body], i) => (
            <li key={title} className="flex gap-5">
              <span className="text-accent pt-1 font-mono text-xs">0{i + 1}</span>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-ink-2 mt-1 max-w-2xl">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Block>

      <Block title="Rules we hold to">
        <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {rules.map(([term, detail]) => (
            <div key={term}>
              <dt className="font-medium">{term}</dt>
              <dd className="text-ink-2 mt-1">{detail}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block title="For contributors">
        <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {contributorSignals.map(([term, detail]) => (
            <div key={term}>
              <dt className="font-medium">{term}</dt>
              <dd className="text-ink-2 mt-1">{detail}</dd>
            </div>
          ))}
        </dl>
        <p className="text-ink-3 mt-8 max-w-2xl text-sm">
          These follow published research on newcomer barriers, pull request abandonment
          and first-response times. Sources are listed in the project README.
        </p>
      </Block>

      <Block title="The index: every definition">
        <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {definitions.map(([term, detail]) => (
            <div key={term}>
              <dt className="font-medium">{term}</dt>
              <dd className="text-ink-2 mt-1 text-[15px]">{detail}</dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-10 font-medium">Where the index can be wrong</h3>
        <ul className="text-ink-2 mt-3 space-y-3 text-[15px]">
          {indexLimits.map((item) => (
            <li key={item} className="flex gap-4">
              <span
                className="bg-ink-3 mt-[0.6em] size-1 shrink-0 rounded-full"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Data, API and credits">
        <div className="text-ink-2 max-w-2xl space-y-4 text-[15px]">
          <p>
            Source: the GitHub GraphQL API, public data only, read by a scheduled job in
            the project&apos;s own repository. The list of organisations comes from the
            Google Summer of Code programme site. The index refreshes every hour, stalest
            repositories first; see{" "}
            <Link href="/status" className="link">
              status
            </Link>
            .
          </p>
          <p>
            Open dataset: every published file is on the{" "}
            <a
              href="https://github.com/gativarshney/contributable/tree/data"
              className="link"
              target="_blank"
              rel="noreferrer"
            >
              data branch
            </a>{" "}
            under CC BY 4.0. Read-only API: <code>/api/v1/repos</code> takes the same
            filters as Explore, <code>/api/v1/repos/owner/name</code> returns one
            repository and <code>/api/v1/status</code> the freshness.
          </p>
          <p>
            The reply-time estimate uses the Kaplan-Meier method, the standard way to
            measure a wait when some of the waiting has not ended yet.
          </p>
        </div>
      </Block>

      <Block title="Limitations">
        <ul className="space-y-3">
          {limitations.map((item) => (
            <li key={item} className="flex gap-4">
              <span
                className="bg-ink-3 mt-[0.7em] size-1 shrink-0 rounded-full"
                aria-hidden="true"
              />
              <p className="max-w-2xl">{item}</p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Privacy">
        <p className="text-ink-2 max-w-2xl">
          Contributable retrieves only what GitHub already serves publicly for the
          repository you enter. It stores nothing, sets no cookies and asks for no
          credentials. Each report also documents its own formulas under every metric.
        </p>
        <p className="text-ink-2 mt-4 max-w-2xl">
          Reply timing describes the project, never a person. The weekly pattern pools
          every team member&apos;s comments, and it is left out entirely when fewer than
          three people contributed to it, because it would then be one maintainer&apos;s
          schedule.
        </p>
        <Link href="/repo/OpenPrinting/cups" className="btn btn-ghost mt-8">
          See it in the example report →
        </Link>
      </Block>
    </div>
  );
}
