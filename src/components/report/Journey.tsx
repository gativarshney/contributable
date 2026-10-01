import type { ObservedWindow } from "@/lib/analysis/contributing";
import { periodLabel } from "@/lib/analysis/time";
import { Block, Notes, Stat } from "./Block";
import { StackedBar } from "./charts";
import { wait } from "./format";

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

/** What happens to work that arrives from outside the team. */
export function Journey({
  pulls,
  replies,
}: {
  /** Pull request outcomes over the longest period that could be read in full. */
  pulls: ObservedWindow | null;
  /** Reply times over the longest period for which comments were read too. */
  replies: ObservedWindow | null;
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
  const closed = pulls.communityMerged + pulls.communityClosedUnmerged;
  const reply =
    replies && replies.medianHoursToResponse !== null
      ? wait(replies.medianHoursToResponse)
      : null;
  const merge = pulls.medianDaysToMerge;

  return (
    <Block
      id="journey"
      question="What happens to my pull request?"
      title={
        pulls.communityMerged > 0 ? (
          <>
            {pulls.communityMerged} pull{" "}
            {pulls.communityMerged === 1 ? "request" : "requests"} from outside the team{" "}
            <em>got merged</em> in the last {period}.
          </>
        ) : closed > 0 ? (
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
                  label: "Closed without merging",
                  value: pulls.communityClosedUnmerged,
                  color: "bg-cat-2",
                },
                {
                  label: "Still open",
                  value: pulls.communityStillOpen,
                  color: "bg-bg-3",
                },
              ]}
            />
          </div>

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

        <div className="border-hair flex gap-12 lg:flex-col lg:border-l lg:pl-12">
          <Stat
            value={merge !== null && merge >= 10 ? Math.round(merge) : merge}
            unit={merge === 1 ? "day" : "days"}
            label="typical time to merge"
          />
          <Stat
            value={reply ? reply.value : null}
            unit={reply?.unit}
            label="typical wait for a first reply"
          />
        </div>
      </div>

      <Notes>
        <li>
          &ldquo;Outside the team&rdquo; means the author is not an owner, organisation
          member or collaborator, and not a bot. Members who keep their membership private
          count as outside.
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
          Figures cover the longest recent period we could read completely: 90 days when
          possible, less on very busy repositories. Typical means the median.
        </li>
      </Notes>
    </Block>
  );
}
