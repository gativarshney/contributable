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

  // Contributor figures use the longest period the data fully covers.
  const span = ([90, 30, 7] as const).find((d) => contributing.windows[d].covered) ?? 30;

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

      <Verdict checklist={checklist} />
      <Start report={report} />
      <Journey
        data={contributing.windows[span]}
        days={span}
        available={contributing.available}
      />
      <People report={report} />

      {contributing.rhythm.total >= 10 ? (
        <Block
          id="timing"
          question="When will someone see my question?"
          title={
            <>
              When maintainers are <em>usually around.</em>
            </>
          }
        >
          <Timing slots={contributing.rhythm.slots} total={contributing.rhythm.total} />
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
          How RepoInsight works
        </Link>
      </footer>
    </article>
  );
}
