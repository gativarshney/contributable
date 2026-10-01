"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Avatar } from "@/components/report/People";
import { Rhythm } from "@/components/report/Rhythm";
import type { ContributingAnalysis } from "@/lib/analysis/contributing";
import type { Checklist } from "@/lib/insights/checklist";

export interface ShowcaseData {
  repository: string;
  checklist: Checklist;
  window: ContributingAnalysis["windows"][90];
  starter: ContributingAnalysis["starter"];
  responders: ContributingAnalysis["responders"];
  rhythm: ContributingAnalysis["rhythm"];
  authors: { name: string; commits: number; share: number }[];
}

const QUESTIONS = [
  ["checklist", "Should I contribute here?"],
  ["start", "Where do I start?"],
  ["merged", "Will my pull request be merged?"],
  ["reply", "Will anyone reply?"],
  ["people", "Who will I work with?"],
  ["timing", "When are maintainers around?"],
] as const;
type QuestionId = (typeof QUESTIONS)[number][0];

function Big({
  value,
  unit,
  children,
}: {
  value: string;
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-display text-[clamp(3.5rem,9vw,6rem)] leading-none">
        {value}
        {unit ? <span className="text-ink-3 ml-2 text-[0.4em]">{unit}</span> : null}
      </p>
      <p className="text-ink-2 mt-4 max-w-md text-lg">{children}</p>
    </div>
  );
}

function Panel({ id, data }: { id: QuestionId; data: ShowcaseData }) {
  const { checklist, window: w, starter, responders, rhythm, authors } = data;
  const closed = w.communityMerged + w.communityClosedUnmerged;
  const hours = w.medianHoursToResponse ?? 0;

  switch (id) {
    case "checklist":
      return (
        <div>
          <Big value={String(checklist.favourable)} unit={`/ ${checklist.checks.length}`}>
            signals look favourable. A count of observable facts, not a score.
          </Big>
          <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {checklist.checks.slice(0, 6).map((check) => (
              <li key={check.id} className="flex items-start gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[9px] ${
                    check.state === "yes"
                      ? "bg-accent text-accent-ink"
                      : "bg-bg-3 text-ink"
                  }`}
                >
                  {check.state === "yes" ? "✓" : check.state === "no" ? "✕" : "?"}
                </span>
                <span>
                  <span className="block font-medium">{check.question}</span>
                  <span className="text-ink-2">{check.answer}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "start":
      return (
        <div>
          <Big value={String(starter.unassigned)} unit="open">
            starter issues nobody has claimed, out of {starter.total} labelled for
            newcomers.
          </Big>
          <ul className="border-hair mt-8 border-t">
            {starter.issues.slice(0, 3).map((issue) => (
              <li key={issue.number} className="border-hair border-b py-3">
                <p className="truncate text-[15px]">{issue.title}</p>
                <p className="text-ink-3 mt-0.5 font-mono text-[11px]">
                  #{issue.number} · {issue.label} · {issue.comments} comments
                </p>
              </li>
            ))}
          </ul>
        </div>
      );
    case "merged":
      return (
        <div>
          <Big value={String(w.mergeShare)} unit="%">
            of community pull requests were merged: {w.communityMerged} of {closed} closed
            in 90 days.
          </Big>
          <div className="border-hair mt-8 flex gap-10 border-t pt-6">
            <div>
              <p className="font-display text-4xl leading-none">{w.medianDaysToMerge}</p>
              <p className="text-ink-2 mt-2 text-sm">median days to merge</p>
            </div>
            <div>
              <p className="font-display text-4xl leading-none">{w.communityOpened}</p>
              <p className="text-ink-2 mt-2 text-sm">opened by the community</p>
            </div>
          </div>
        </div>
      );
    case "reply":
      return (
        <div>
          <Big
            value={String(hours < 48 ? Math.round(hours) : Math.round(hours / 24))}
            unit={hours < 48 ? "hours" : "days"}
          >
            is the typical wait for a first human reply. Bots do not count.
          </Big>
          <div className="mt-8">
            <div className="bg-bg-3 h-2 overflow-hidden rounded-full">
              <div
                className="bg-accent h-full rounded-full"
                style={{ width: `${(w.answered / Math.max(1, w.threads)) * 100}%` }}
              />
            </div>
            <p className="text-ink-2 mt-3 text-sm">
              {w.answered} of {w.threads} community issues and pull requests got an
              answer.
            </p>
          </div>
        </div>
      );
    case "people":
      return (
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="eyebrow border-hair border-b pb-3">Maintainers who reply</p>
            <ul className="mt-4 space-y-4">
              {responders.slice(0, 3).map((person) => (
                <li key={person.login} className="flex items-center gap-3">
                  <Avatar login={null} name={person.login} real={false} />
                  <span>
                    <span className="block font-medium">{person.login}</span>
                    <span className="text-ink-2 text-sm">
                      {person.threads} community threads
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow border-hair border-b pb-3">Most active, 90 days</p>
            <ul className="mt-4 space-y-4">
              {authors.slice(0, 3).map((person) => (
                <li key={person.name} className="flex items-center gap-3">
                  <Avatar login={null} name={person.name} real={false} />
                  <span>
                    <span className="block font-medium">{person.name}</span>
                    <span className="text-ink-2 text-sm">
                      {person.commits} commits · {person.share}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    case "timing":
      return <Rhythm slots={rhythm.slots} total={rhythm.total} className="h-[260px]" />;
  }
}

/** Six contributor questions, each answered from the example report. */
export function Showcase({ data }: { data: ShowcaseData }) {
  const [active, setActive] = useState<QuestionId>("checklist");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + QUESTIONS.length) % QUESTIONS.length;
    setActive(QUESTIONS[next][0]);
    tabs.current[next]?.focus();
  }

  return (
    <div
      className="border-hair-strong bg-bg-2 overflow-hidden rounded-2xl border"
      style={{ boxShadow: "var(--shadow)" }}
    >
      <div className="border-hair flex items-center justify-between gap-4 border-b px-5 py-3">
        <p className="eyebrow truncate">
          Example analysis · {data.repository} · illustrative data
        </p>
        <Link
          href="/sample"
          className="text-ink-2 hover:text-ink shrink-0 text-sm transition-colors"
        >
          Full report →
        </Link>
      </div>

      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label="Questions a contributor asks"
          aria-orientation="vertical"
          className="border-hair flex gap-1 overflow-x-auto border-b p-3 lg:flex-col lg:overflow-visible lg:border-r lg:border-b-0"
        >
          {QUESTIONS.map(([id, question], index) => (
            <button
              key={id}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={active === id}
              aria-controls="showcase-panel"
              tabIndex={active === id ? 0 : -1}
              onClick={() => setActive(id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`cursor-pointer rounded-lg px-4 py-3 text-left text-[15px] whitespace-nowrap transition-colors duration-200 lg:whitespace-normal ${
                active === id
                  ? "bg-bg text-ink shadow-sm"
                  : "text-ink-2 hover:text-ink hover:bg-bg/50"
              }`}
            >
              <span className="text-accent mr-3 font-mono text-[11px]">0{index + 1}</span>
              {question}
            </button>
          ))}
        </div>

        <div
          id="showcase-panel"
          role="tabpanel"
          aria-labelledby={`tab-${active}`}
          className="min-h-[420px] p-6 md:p-10"
        >
          <div key={active} className="rise">
            <Panel id={active} data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
