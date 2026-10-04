"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { Skyline } from "@/components/three/Skyline";
import type { Report } from "@/lib/report/run";
import { Block } from "./Block";
import { Codebase } from "./Codebase";
import { compact, day, shortDay } from "./format";
import { Journey } from "./Journey";
import { People } from "./People";
import { Pulse } from "./Pulse";
import { Start } from "./Start";
import { Timing } from "./Timing";
import { RHYTHM_MIN_PEOPLE } from "@/lib/analysis/contributing";
import { Verdict } from "./Verdict";

export function ReportView({ report }: { report: Report }) {
  const { repository: repo, analysis, checklist } = report;
  const { activity, contributing } = analysis;

  // Twelve weeks of daily commits for the 3D skyline in the header.
  const days = useMemo(() => activity.daily.slice(-84), [activity.daily]);
  const skyline = useMemo(() => days.map((d) => d.count), [days]);
  const skylineTooltip = useCallback(
    (index: number, value: number) =>
      days[index]
        ? `${shortDay(days[index].date)} · ${value} commit${value === 1 ? "" : "s"}`
        : null,
    [days],
  );

  return (
    <article className="shell pb-16">
      {report.sample ? (
        <p className="border-accent bg-accent-soft mt-8 rounded-r-lg border-l-2 px-4 py-3 text-sm">
          <strong className="font-medium">Example report.</strong> This repository does
          not exist. The data is made up to show what a report looks like.
        </p>
      ) : null}

      <header className="grid items-center gap-x-10 gap-y-6 pt-12 pb-12 md:pt-16 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          {!report.sample ? (
            <p className="border-hair-strong text-ink-2 mb-5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border px-3 py-1 text-xs">
              <span className="bg-accent size-1.5 rounded-full" aria-hidden="true" />
              Checked just now from GitHub
              <span className="text-ink-3">·</span>
              <span>Not in the Google Summer of Code list</span>
            </p>
          ) : null}
          <h1 className="display text-[clamp(2.2rem,5.6vw,4.25rem)] break-words">
            <span className="inline-block max-w-full">{repo.owner}/</span>
            <wbr />
            <em>{repo.name}</em>
          </h1>
          {repo.description ? (
            <p className="text-ink-2 mt-5 max-w-2xl text-lg">{repo.description}</p>
          ) : null}
          <div className="text-ink-2 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span>
              <strong className="text-ink font-medium">{compact(repo.stars)}</strong>{" "}
              stars
            </span>
            <span>
              <strong className="text-ink font-medium">{compact(repo.forks)}</strong>{" "}
              forks
            </span>
            {repo.language ? <span>{repo.language}</span> : null}
            {repo.license ? <span>{repo.license}</span> : null}
            {repo.archived ? (
              <span className="text-danger font-medium">Archived</span>
            ) : null}
            {!report.sample ? (
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="link text-ink"
              >
                Open on GitHub ↗
              </a>
            ) : null}
          </div>
        </div>
        {skyline.some((count) => count > 0) ? (
          <figure>
            <Skyline
              values={skyline}
              interactive
              tooltip={skylineTooltip}
              label={`Commits per day over the last 12 weeks. Busiest day: ${Math.max(...skyline)} commits.`}
              className="h-[220px] w-full"
            />
            <figcaption className="text-ink-3 mt-1 text-center text-xs">
              Twelve weeks of commits. Each bar is a day; taller means more.
            </figcaption>
          </figure>
        ) : null}
      </header>

      {report.policy ? (
        <aside
          role="note"
          className="border-slow/50 bg-slow/10 mb-10 flex gap-4 rounded-2xl border p-5 md:p-6"
        >
          <svg
            viewBox="0 0 24 24"
            className="text-slow mt-0.5 size-6 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
          <div>
            <p className="font-medium">
              This project says it does not take pull requests here.
            </p>
            <blockquote className="text-ink-2 border-hair-strong mt-2 border-l-2 pl-3 text-sm italic">
              “{report.policy}”
            </blockquote>
            <p className="text-ink-2 mt-3 text-sm">
              From its README or contributing guide. The figures below still describe the
              repository, but read the project&apos;s own instructions before you open a
              pull request.{" "}
              <a
                href={`${repo.url}#readme`}
                target="_blank"
                rel="noreferrer"
                className="link"
              >
                Read them on GitHub
              </a>
            </p>
          </div>
        </aside>
      ) : null}
      <Verdict checklist={checklist} />
      <Start report={report} />
      <Journey
        pulls={contributing.observed}
        replies={contributing.observedReplies}
        queue={contributing.queue}
        real={!report.sample}
      />
      <People report={report} />

      {contributing.rhythm.total >= 10 &&
      contributing.rhythm.people >= RHYTHM_MIN_PEOPLE ? (
        <Block
          id="timing"
          question="When will someone see my question?"
          title={
            <>
              When the project is <em>most responsive.</em>
            </>
          }
        >
          <Timing {...contributing.rhythm} />
        </Block>
      ) : null}

      <Codebase report={report} />
      <Pulse report={report} />

      <footer className="border-hair text-ink-3 flex flex-wrap items-center justify-between gap-4 border-t pt-8 text-sm">
        <p>
          Read from GitHub on {day(report.fetchedAt)} at {report.fetchedAt.slice(11, 16)}{" "}
          UTC. Public data only.
        </p>
        <Link href="/methodology" className="link text-ink-2">
          How Contributable works
        </Link>
      </footer>
    </article>
  );
}
