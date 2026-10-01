import { wholeDaysSince } from "@/lib/analysis/time";
import type { Report } from "@/lib/report/run";
import { Block, Notes } from "./Block";
import { ago } from "./format";

export function Start({ report }: { report: Report }) {
  const { starter, files } = report.analysis.contributing;
  const now = new Date(report.fetchedAt);
  const real = !report.sample;

  return (
    <Block
      id="start"
      question="Where do I start?"
      title={
        starter.unassigned > 0 ? (
          <>
            {starter.unassigned} starter{" "}
            {starter.unassigned === 1 ? "issue is" : "issues are"}{" "}
            <em>waiting for someone.</em>
          </>
        ) : (
          <>
            No issues are <em>marked for newcomers.</em>
          </>
        )
      }
    >
      {starter.issues.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {starter.issues.slice(0, 4).map((issue) => {
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
                    <span className="bg-accent-soft text-accent rounded-full px-2.5 py-0.5 text-xs">
                      {issue.label}
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
                  <span className="text-ink-2 mt-auto pt-4 text-sm">
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

      {starter.medianAgeDays !== null && starter.medianAgeDays > 180 ? (
        <p className="text-ink-2 mt-5 text-[15px]">
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
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6">
        <Notes>
          <li>
            Starter issues are open issues labelled &ldquo;good first issue&rdquo; or
            &ldquo;help wanted&rdquo; with nobody assigned. Projects with their own labels
            show none.
          </li>
          <li>
            An unassigned issue can still have somebody&rsquo;s pull request open against
            it.
          </li>
          <li>Files are detected by GitHub in the standard locations only.</li>
        </Notes>
      </div>
      {real ? (
        <a
          href={`${report.repository.url}/contribute`}
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
