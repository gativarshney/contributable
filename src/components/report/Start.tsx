import { wholeDaysSince } from "@/lib/analysis/time";
import { isSourceAvailable } from "@/lib/github/signals";
import type { Report } from "@/lib/report/run";
import type { StarterIssue } from "@/types";
import { Block, Notes } from "./Block";
import { ago } from "./format";

/** Whether an issue is really up for grabs, in a sentence. */
function Availability({ issue, now }: { issue: StarterIssue; now: Date }) {
  const state = issue.availability;
  if (state.state === "unchecked") return null;

  if (state.state === "free") {
    return (
      <span className="text-accent flex items-center gap-2 text-sm">
        <span aria-hidden="true" className="bg-accent size-1.5 rounded-full" />
        Looks free: no open pull request, nobody has asked for it
      </span>
    );
  }
  if (state.state === "linked") {
    return (
      <span className="text-ink-2 flex items-center gap-2 text-sm">
        <span aria-hidden="true" className="bg-series-2 size-1.5 rounded-full" />
        Taken: pull request #{state.pullRequest} is open for it
      </span>
    );
  }
  const asked = wholeDaysSince(state.at, now);
  return (
    <span className="text-ink-2 flex items-center gap-2 text-sm">
      <span aria-hidden="true" className="bg-series-2 size-1.5 rounded-full" />
      {state.by ?? "Someone"} asked to take it {ago(asked)}
      {asked > 21 ? ". Worth asking if it is still theirs" : ""}
    </span>
  );
}

export function Start({ report }: { report: Report }) {
  const { starter, files, claBot } = report.analysis.contributing;
  const { repository } = report;
  const now = new Date(report.fetchedAt);
  const real = !report.sample;
  const shown = starter.issues.slice(0, 4);
  const checked = shown.filter((issue) => issue.availability.state !== "unchecked");
  const free = shown.filter((issue) => issue.availability.state === "free").length;

  const blocks: string[] = [];
  if (isSourceAvailable(repository.license)) {
    blocks.push(
      `The licence (${repository.license}) is source-available, not open source. Read its terms before you contribute.`,
    );
  }
  if (claBot) {
    blocks.push(
      `Expect to sign a contributor licence agreement: ${claBot} checks pull requests here.`,
    );
  }

  return (
    <Block
      id="start"
      question="Where do I start?"
      title={
        starter.unassigned === 0 ? (
          <>
            No issues are <em>marked for newcomers.</em>
          </>
        ) : checked.length > 0 ? (
          <>
            {free} of the {checked.length} starter issues we checked{" "}
            <em>{free === 1 ? "looks free to take." : "look free to take."}</em>
          </>
        ) : (
          <>
            {starter.unassigned} starter{" "}
            {starter.unassigned === 1 ? "issue is" : "issues are"}{" "}
            <em>waiting for someone.</em>
          </>
        )
      }
    >
      {blocks.length > 0 ? (
        <ul className="mb-8 max-w-3xl space-y-2">
          {blocks.map((text) => (
            <li
              key={text}
              className="border-series-2 bg-bg-2 rounded-r-lg border-l-2 px-4 py-3 text-[15px]"
            >
              <strong className="font-medium">Before you invest time.</strong> {text}
            </li>
          ))}
        </ul>
      ) : null}

      {shown.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((issue) => {
            const age = wholeDaysSince(issue.createdAt, now);
            return (
              <li key={issue.number}>
                <a
                  href={real ? issue.url : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="card hover:border-accent group flex h-full flex-col p-5 transition-colors duration-200"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="bg-accent-soft text-accent rounded-full px-2.5 py-0.5 text-xs">
                        {issue.label}
                      </span>
                      {issue.byMaintainer ? (
                        <span className="border-hair-strong text-ink-2 rounded-full border px-2.5 py-0.5 text-xs">
                          written by a maintainer
                        </span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-ink-3 group-hover:text-accent transition-colors"
                    >
                      ↗
                    </span>
                  </span>
                  <span className="mt-4 text-lg leading-snug font-medium tracking-tight">
                    {issue.title}
                  </span>
                  <span className="mt-3">
                    <Availability issue={issue} now={now} />
                  </span>
                  <span className="text-ink-3 mt-auto pt-4 text-sm">
                    Opened {ago(age)} · {issue.comments}{" "}
                    {issue.comments === 1 ? "comment" : "comments"} · nobody assigned
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="card text-ink-2 max-w-2xl p-6">
          {starter.available
            ? "Nothing open carries the labels “good first issue” or “help wanted”. The project may use its own labels, so check its issue tracker and contributing guide."
            : "GitHub did not return labelled issues for this repository."}
        </p>
      )}

      {starter.unassigned > shown.length ? (
        <p className="text-ink-2 mt-5 text-[15px]">
          {starter.unassigned - shown.length} more unassigned starter{" "}
          {starter.unassigned - shown.length === 1 ? "issue is" : "issues are"} open. We
          only check the first four in detail.
        </p>
      ) : null}

      {starter.medianAgeDays !== null && starter.medianAgeDays > 180 ? (
        <p className="text-ink-2 mt-3 text-[15px]">
          Heads up: these were opened a long time ago (typically{" "}
          {ago(starter.medianAgeDays)}). Ask on the issue whether it is still wanted
          before you start.
        </p>
      ) : null}

      {files ? (
        <div className="mt-10">
          <p className="text-ink-2 text-sm">What the project gives you to work from</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {files.map((file) => {
              const present = file.url !== null;
              const body = (
                <>
                  <span
                    aria-hidden="true"
                    className={`grid size-4 place-items-center rounded-full text-[10px] ${
                      present ? "bg-accent text-accent-ink" : "bg-bg-3 text-ink-3"
                    }`}
                  >
                    {present ? "✓" : "✕"}
                  </span>
                  {file.label}
                  <span className="sr-only">{present ? "found" : "not found"}</span>
                </>
              );
              const className = `inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm ${
                present ? "border-hair-strong" : "border-hair text-ink-3"
              }`;
              return (
                <li key={file.key}>
                  {present && file.url && real ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`${className} hover:border-accent transition-colors`}
                    >
                      {body}
                    </a>
                  ) : (
                    <span className={className}>{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-ink-2 mt-4 text-sm">
            Pull requests normally target the default branch,{" "}
            <code className="bg-bg-3 rounded px-1.5 py-0.5 font-mono text-xs">
              {repository.defaultBranch}
            </code>
            . Check the contributing guide in case this project uses another.
          </p>
        </div>
      ) : null}

      <Notes>
        <li>
          Starter issues are open issues labelled &ldquo;good first issue&rdquo; or
          &ldquo;help wanted&rdquo; with nobody assigned. Projects with their own labels
          show none.
        </li>
        <li>
          For the first four we read the issue&rsquo;s history. &ldquo;Looks free&rdquo;
          means no open pull request refers to it and nobody outside the team has written
          that they want to take it. We match common phrases, so an unusual wording can be
          missed.
        </li>
        <li>
          A contributor licence agreement is inferred from a known CLA bot commenting on
          recent pull requests. Projects that enforce one some other way are not detected.
        </li>
        <li>Files are detected by GitHub in the standard locations only.</li>
      </Notes>
      {real ? (
        <a
          href={`${repository.url}/contribute`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost mt-6"
        >
          See all starter issues on GitHub ↗
        </a>
      ) : null}
    </Block>
  );
}
