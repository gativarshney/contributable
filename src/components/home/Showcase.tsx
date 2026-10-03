"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Stat } from "@/components/report/Block";
import { Donut, Ring, StackedBar } from "@/components/report/charts";
import { wait } from "@/components/report/format";
import { Avatar } from "@/components/report/People";
import { Timing } from "@/components/report/Timing";
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
  people: number;
}

const QUESTIONS = [
  ["checklist", "Should I contribute here?"],
  ["start", "Where do I start?"],
  ["merged", "Will my pull request be merged?"],
  ["reply", "Will anyone reply?"],
  ["people", "Who will I work with?"],
  ["timing", "When do replies arrive?"],
] as const;
type QuestionId = (typeof QUESTIONS)[number][0];

const SLICES = [
  { color: "bg-cat-1", stroke: "var(--cat-1)" },
  { color: "bg-cat-2", stroke: "var(--cat-2)" },
  { color: "bg-cat-3", stroke: "var(--cat-3)" },
];

function Panel({ id, data }: { id: QuestionId; data: ShowcaseData }) {
  const { checklist, window: w, starter, responders, rhythm, authors } = data;

  switch (id) {
    case "checklist":
      return (
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:gap-12">
          <Ring
            value={checklist.favourable}
            total={checklist.checks.length}
            label={`${checklist.favourable} of ${checklist.checks.length} signals favourable`}
          />
          <ul className="min-w-0 flex-1 space-y-3">
            {checklist.checks.slice(5).map((check) => (
              <li key={check.id} className="flex items-start gap-3 text-[15px]">
                <span
                  aria-hidden="true"
                  className={`mt-1 grid size-4 shrink-0 place-items-center rounded-full text-[9px] ${
                    check.state === "yes"
                      ? "bg-accent text-accent-ink"
                      : "bg-bg-3 text-ink"
                  }`}
                >
                  {check.state === "yes" ? "✓" : check.state === "no" ? "✕" : "?"}
                </span>
                <span>
                  <span className="block font-medium">{check.question}</span>
                  <span className="text-ink-2 text-sm">{check.answer}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "start":
      return (
        <div>
          <Stat
            value={starter.unassigned}
            unit="open"
            label="starter issues that nobody has claimed yet"
          />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {starter.issues.slice(0, 2).map((issue) => (
              <li key={issue.number} className="card bg-bg p-5">
                <span className="bg-accent-soft text-accent rounded-full px-2.5 py-0.5 text-xs">
                  {issue.label}
                </span>
                <p className="mt-3 font-medium tracking-tight">{issue.title}</p>
                <p className="text-ink-2 mt-2 text-sm">
                  {issue.comments} comments · nobody assigned
                </p>
              </li>
            ))}
          </ul>
        </div>
      );
    case "merged":
      return (
        <div>
          <Stat
            value={w.communityMerged}
            label="pull requests from outside the team were merged in 90 days"
          />
          <div className="mt-8">
            <StackedBar
              label="Outcome of community pull requests"
              segments={[
                { label: "Merged", value: w.communityMerged, color: "bg-cat-1" },
                {
                  label: "Closed without merging",
                  value: w.communityClosedUnmerged,
                  color: "bg-cat-2",
                },
                { label: "Still open", value: w.communityStillOpen, color: "bg-bg-3" },
              ]}
            />
          </div>
        </div>
      );
    case "reply": {
      const reply = wait(w.medianHoursToResponse ?? 0);
      return (
        <div>
          <Stat
            value={reply.value}
            unit={reply.unit}
            label="is the typical wait for a first reply"
          />
          <div className="mt-8">
            <StackedBar
              label="Time to first reply"
              segments={[
                { label: "Within a day", value: w.replies.withinDay, color: "bg-accent" },
                {
                  label: "Within a week",
                  value: w.replies.withinWeek,
                  color: "bg-accent/60",
                },
                { label: "Longer", value: w.replies.later, color: "bg-accent/30" },
                { label: "Still waiting", value: w.replies.waiting, color: "bg-bg-3" },
              ]}
            />
          </div>
        </div>
      );
    }
    case "people": {
      const top = authors.slice(0, 3);
      const total = authors.reduce((sum, a) => sum + a.commits, 0);
      const rest = total - top.reduce((sum, a) => sum + a.commits, 0);
      return (
        <div className="flex flex-col gap-10 md:flex-row md:items-center">
          <Donut
            label="Share of commits by author"
            segments={[
              ...top.map((a, i) => ({ label: a.name, value: a.commits, ...SLICES[i] })),
              {
                label: "Everyone else",
                value: rest,
                color: "bg-bg-3",
                stroke: "var(--bg-3)",
              },
            ]}
          >
            <p>
              <span className="block text-3xl leading-none font-medium">
                {data.people}
              </span>
              <span className="text-ink-2 mt-1 block text-xs">people</span>
            </p>
          </Donut>
          <div className="min-w-0 flex-1">
            <p className="text-ink-2 mb-4 text-sm">Maintainers who reply to newcomers</p>
            <ul className="space-y-4">
              {responders.slice(0, 3).map((person) => (
                <li key={person.login} className="flex items-center gap-3">
                  <Avatar login={null} name={person.login} real={false} size={40} />
                  <span>
                    <span className="block font-medium tracking-tight">
                      {person.login}
                    </span>
                    <span className="text-ink-2 text-sm">{person.threads} threads</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
    case "timing":
      return <Timing {...rhythm} />;
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
      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label="Questions a contributor asks"
          className="border-hair grid grid-cols-2 gap-1 border-b p-3 sm:grid-cols-3 lg:grid-cols-1 lg:content-start lg:border-r lg:border-b-0"
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
              className={`cursor-pointer rounded-lg px-4 py-3 text-left text-[15px] leading-snug transition-colors duration-200 ${
                active === id
                  ? "bg-bg text-ink shadow-sm"
                  : "text-ink-2 hover:text-ink hover:bg-bg/50"
              }`}
            >
              {question}
            </button>
          ))}
        </div>

        <div
          id="showcase-panel"
          role="tabpanel"
          aria-labelledby={`tab-${active}`}
          className="min-h-[400px] p-6 md:p-10"
        >
          <div key={active} className="rise">
            <Panel id={active} data={data} />
          </div>
        </div>
      </div>
      <div className="border-hair text-ink-3 flex items-center justify-between gap-4 border-t px-5 py-3 text-sm">
        <p className="truncate">Example data for a made-up repository</p>
        <Link
          href="/sample"
          className="text-ink-2 hover:text-ink shrink-0 transition-colors"
        >
          See the full example →
        </Link>
      </div>
    </div>
  );
}
