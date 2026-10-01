import type { ContributingWindow } from "@/lib/analysis/contributing";
import type { WindowDays } from "@/types";
import { Block, Notes, Stat } from "./Block";
import { StackedBar } from "./charts";
import { wait } from "./format";

/** What happens to work that arrives from outside the team. */
export function Journey({
  data,
  days,
  available,
}: {
  data: ContributingWindow;
  days: WindowDays;
  available: boolean;
}) {
  const closed = data.communityMerged + data.communityClosedUnmerged;
  const reply =
    data.medianHoursToResponse === null ? null : wait(data.medianHoursToResponse);
  const { replies } = data;

  return (
    <Block
      id="journey"
      question="What happens to my pull request?"
      title={
        !available ? (
          <>Pull request data is not available for this repository.</>
        ) : data.communityMerged > 0 ? (
          <>
            {data.communityMerged} pull{" "}
            {data.communityMerged === 1 ? "request" : "requests"} from outside the team{" "}
            <em>got merged</em> in the last {days} days.
          </>
        ) : closed > 0 ? (
          <>
            No outside pull request <em>was merged</em> in the last {days} days.
          </>
        ) : (
          <>
            Nobody outside the team <em>has opened a pull request</em> lately.
          </>
        )
      }
    >
      {available ? (
        <>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
            <div className="space-y-12">
              <div>
                <h3 className="mb-4 font-medium tracking-tight">
                  Where outside pull requests ended up
                </h3>
                <StackedBar
                  label="Outcome of community pull requests"
                  segments={[
                    { label: "Merged", value: data.communityMerged, color: "bg-cat-1" },
                    {
                      label: "Closed without merging",
                      value: data.communityClosedUnmerged,
                      color: "bg-cat-2",
                    },
                    {
                      label: "Still open",
                      value: data.communityStillOpen,
                      color: "bg-bg-3",
                    },
                  ]}
                />
              </div>

              <div>
                <h3 className="mb-4 font-medium tracking-tight">
                  How long people waited for a first reply
                </h3>
                {data.responseCovered ? (
                  <StackedBar
                    label="Time to first reply on community issues and pull requests"
                    segments={[
                      {
                        label: "Within a day",
                        value: replies.withinDay,
                        color: "bg-accent",
                      },
                      {
                        label: "Within a week",
                        value: replies.withinWeek,
                        color: "bg-accent/60",
                      },
                      { label: "Longer", value: replies.later, color: "bg-accent/30" },
                      {
                        label: "Closed, no reply seen",
                        value: replies.closedQuietly,
                        color: "bg-ink-3",
                      },
                      {
                        label: "Still waiting",
                        value: replies.waiting,
                        color: "bg-bg-3",
                      },
                    ]}
                  />
                ) : (
                  <p className="text-ink-2 text-[15px]">
                    This repository has more discussion than we can read for the last{" "}
                    {days} days, so reply times are not shown.
                  </p>
                )}
              </div>
            </div>

            <div className="border-hair flex gap-12 lg:flex-col lg:border-l lg:pl-12">
              <Stat
                value={
                  data.medianDaysToMerge !== null && data.medianDaysToMerge >= 10
                    ? Math.round(data.medianDaysToMerge)
                    : data.medianDaysToMerge
                }
                unit={data.medianDaysToMerge === 1 ? "day" : "days"}
                label="typical time to merge"
              />
              <Stat
                value={data.responseCovered && reply ? reply.value : null}
                unit={reply?.unit}
                label="typical wait for a first reply"
              />
            </div>
          </div>

          <Notes>
            <li>
              &ldquo;Outside the team&rdquo; means the author is not an owner,
              organisation member or collaborator, and not a bot. Members who keep their
              membership private count as outside.
            </li>
            <li>
              Closed without merging includes withdrawn, duplicate and low-quality
              submissions. It is not a measure of how fairly reviews are done.
            </li>
            <li>
              A reply is the first comment from another person, or a merge. Bot comments
              are ignored. Approving a pull request without commenting is not visible to
              us, so those show as &ldquo;closed, no reply seen&rdquo;.
            </li>
            <li>Typical means the median: half were faster, half slower.</li>
          </Notes>
        </>
      ) : null}
    </Block>
  );
}
