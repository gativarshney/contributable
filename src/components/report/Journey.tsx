import type { ContributingAnalysis, ObservedWindow } from "@/lib/analysis/contributing";
import { periodLabel } from "@/lib/analysis/time";
import { Block, Notes, Stat } from "./Block";
import { StackedBar } from "./charts";
import { fmt, wait } from "./format";

/** Shown when a repository is too busy to read a full week of. */
function Partial({ days, what }: { days: number; what: string }) {
  if (days >= 7) return null;
  return (
    <p className="border-series-2 bg-bg-2 mb-8 max-w-3xl rounded-r-lg border-l-2 px-4 py-3 text-[15px]">
      <strong className="font-medium">A very busy repository.</strong> We could read{" "}
      {what} for the last {periodLabel(days)} only, so these figures cover that period.
      They are exact for it, not an estimate of a longer one.
    </p>
  );
}

const days = (n: number) => (n >= 10 ? Math.round(n) : n);

/** What happens to work that arrives from outside the team. */
export function Journey({
  pulls,
  replies,
  queue,
  real,
}: {
  /** Pull request outcomes over the longest period that could be read in full. */
  pulls: ObservedWindow | null;
  /** Reply times over the longest period for which comments were read too. */
  replies: ObservedWindow | null;
  queue: ContributingAnalysis["queue"];
  /** False for the example report, whose pull requests do not exist. */
  real: boolean;
}) {
  if (!pulls) {
    return (
      <Block
        id="journey"
        question="What happens to my pull request?"
        title={<>Pull request data is not available for this repository.</>}
      >
        {null}
      </Block>
    );
  }

  const period = periodLabel(pulls.days);
  const landed = pulls.communityMerged + pulls.landedOtherwise;
  const rejected = pulls.communityClosedUnmerged - pulls.landedOtherwise;
  const reply =
    replies && replies.medianHoursToResponse !== null
      ? wait(replies.medianHoursToResponse)
      : null;
  const merge = pulls.medianDaysToMerge;
  const team = pulls.teamMedianDaysToMerge;

  return (
    <Block
      id="journey"
      question="What happens to my pull request?"
      title={
        landed > 0 ? (
          <>
            {landed} pull {landed === 1 ? "request" : "requests"} from outside the team{" "}
            <em>got merged</em> in the last {period}.
          </>
        ) : rejected > 0 ? (
          <>
            No outside pull request <em>was merged</em> in the last {period}.
          </>
        ) : (
          <>
            Nobody outside the team <em>has opened a pull request</em> lately.
          </>
        )
      }
    >
      <Partial days={pulls.days} what="pull requests" />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
        <div className="space-y-12">
          <div>
            <h3 className="mb-4 font-medium tracking-tight">
              Where outside pull requests ended up
            </h3>
            <StackedBar
              label="Outcome of community pull requests"
              segments={[
                { label: "Merged", value: pulls.communityMerged, color: "bg-cat-1" },
                {
                  label: "Landed as a commit",
                  value: pulls.landedOtherwise,
                  color: "bg-cat-3",
                },
                { label: "Closed without merging", value: rejected, color: "bg-cat-2" },
                {
                  label: "Still open",
                  value: pulls.communityStillOpen,
                  color: "bg-bg-3",
                },
              ]}
            />
            {pulls.humanMerged > 0 ? (
              <p className="text-ink-2 mt-4 text-[15px]">
                <strong className="text-ink font-medium">
                  {pulls.communityMerged} of {pulls.humanMerged}
                </strong>{" "}
                merged pull requests came from outside the team.
              </p>
            ) : null}
          </div>

          {pulls.merged.length > 0 ? (
            <div>
              <h3 className="mb-3 font-medium tracking-tight">
                The proof: recently merged from outside the team
              </h3>
              <ul className="border-hair border-t">
                {pulls.merged.map((item) => (
                  <li key={item.number} className="border-hair border-b">
                    <a
                      href={real ? item.url : undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-baseline gap-4 py-3 text-[15px]"
                    >
                      <span className="text-ink-3 w-14 shrink-0 font-mono text-xs">
                        #{item.number}
                      </span>
                      <span className="group-hover:text-accent min-w-0 flex-1 truncate transition-colors">
                        {item.title}
                      </span>
                      <span className="text-ink-2 hidden shrink-0 text-sm sm:inline">
                        {item.author}
                      </span>
                      <span className="text-ink-2 w-20 shrink-0 text-right text-sm">
                        {item.daysToMerge < 1
                          ? "same day"
                          : `${days(item.daysToMerge)} ${item.daysToMerge === 1 ? "day" : "days"}`}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <h3 className="mb-4 font-medium tracking-tight">
              How long people waited for a first reply
              {replies && replies.days !== pulls.days ? (
                <span className="text-ink-2 font-normal">
                  {" "}
                  (last {periodLabel(replies.days)})
                </span>
              ) : null}
            </h3>
            {replies ? (
              <StackedBar
                label="Time to first reply on community issues and pull requests"
                segments={[
                  {
                    label: "Within a day",
                    value: replies.replies.withinDay,
                    color: "bg-accent",
                  },
                  {
                    label: "Within a week",
                    value: replies.replies.withinWeek,
                    color: "bg-accent/60",
                  },
                  {
                    label: "Longer",
                    value: replies.replies.later,
                    color: "bg-accent/30",
                  },
                  {
                    label: "Closed, no reply seen",
                    value: replies.replies.closedQuietly,
                    color: "bg-ink-3",
                  },
                  {
                    label: "Still waiting",
                    value: replies.replies.waiting,
                    color: "bg-bg-3",
                  },
                ]}
              />
            ) : (
              <p className="text-ink-2 text-[15px]">
                GitHub did not return the conversations needed to measure this.
              </p>
            )}
          </div>
        </div>

        <div className="border-hair flex flex-wrap gap-x-12 gap-y-10 lg:flex-col lg:border-l lg:pl-12">
          <Stat
            value={merge === null ? null : days(merge)}
            unit={merge === 1 ? "day" : "days"}
            label="typical time to merge, from outside"
            detail={
              team === null
                ? null
                : `The team's own: ${days(team)} ${team === 1 ? "day" : "days"}`
            }
          />
          <Stat
            value={reply ? reply.value : null}
            unit={reply?.unit}
            label="typical wait for a first reply"
          />
          {queue ? (
            <Stat
              value={queue.weeks === null ? null : fmt(Math.round(queue.weeks))}
              unit={queue.weeks === 1 ? "week" : "weeks"}
              label="of pull requests in the queue"
              detail={`${fmt(queue.open)} open, about ${fmt(Math.round(queue.mergedPerWeek))} merged a week`}
            />
          ) : null}
        </div>
      </div>

      <Notes>
        <li>
          &ldquo;Outside the team&rdquo; means the author is not an owner, organisation
          member or collaborator, and not a bot. Members who keep their membership private
          count as outside.
        </li>
        <li>
          &ldquo;Landed as a commit&rdquo; is a pull request that was closed rather than
          merged, where a later commit mentions it or credits its author. Some projects
          apply outside work this way, and it would otherwise look like a rejection.
        </li>
        <li>
          Closed without merging includes withdrawn, duplicate and low-quality
          submissions. It is not a measure of how fairly reviews are done.
        </li>
        <li>
          A reply is the first comment from another person, or a merge. Bot comments are
          ignored. Approving a pull request without commenting is not visible to us, so
          those show as &ldquo;closed, no reply seen&rdquo;.
        </li>
        <li>
          The queue is open pull requests divided by pull requests merged per week (bots
          excluded). It is a rough guide to how crowded review is, not a waiting time.
        </li>
        <li>
          Figures cover the longest recent period we could read completely: 90 days when
          possible, less on very busy repositories. Typical means the median.
        </li>
      </Notes>
    </Block>
  );
}
