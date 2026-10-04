"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RepoInput } from "@/components/site/RepoInput";
import type { AnalysisEvent, Report, ReportError, StageId } from "@/lib/report/run";
import { ReportView } from "./ReportView";

const STAGES: { id: StageId; label: string; icon: string }[] = [
  {
    id: "repository",
    label: "Repository",
    icon: "M4 5a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2V5Zm0 15a2 2 0 0 0 2 2h12v-4",
  },
  {
    id: "commits",
    label: "Commits",
    icon: "M2 12h6m8 0h6M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  },
  {
    id: "releases",
    label: "Releases",
    icon: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01",
  },
  {
    id: "issues",
    label: "Issues and PRs",
    icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5m0 3h.01",
  },
  {
    id: "contributing",
    label: "Conversations",
    icon: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z",
  },
  {
    id: "report",
    label: "Report",
    icon: "M5 20V10m7 10V4m7 16v-7",
  },
];

type State =
  | { status: "loading"; done: Partial<Record<StageId, string>>; direct?: boolean }
  | { status: "ready"; report: Report }
  | { status: "error"; error: ReportError };

/** Splits "121 commits" into the figure and the words after it. */
function headline(detail: string): { figure: string | null; rest: string } {
  const match = /^([\d,]+)\s+(.*)$/.exec(detail);
  return match ? { figure: match[1], rest: match[2] } : { figure: null, rest: detail };
}

function Progress({
  owner,
  name,
  done,
  direct,
}: {
  owner: string;
  name: string;
  done: Partial<Record<StageId, string>>;
  /** True when this browser is reading GitHub itself rather than through our server. */
  direct: boolean;
}) {
  const finished = STAGES.filter((stage) => stage.id in done).length;
  const found = "repository" in done;
  const size = 132;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="shell flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center py-16 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-bg-3"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(finished / STAGES.length) * circumference} ${circumference}`}
            className="stroke-accent transition-[stroke-dasharray] duration-500 ease-out"
          />
        </svg>
        <span className="scan-ring absolute inset-0 rounded-full" aria-hidden="true" />
        <p className="absolute inset-0 grid place-items-center text-3xl font-medium tracking-tight">
          <span>
            {finished}
            <span className="text-ink-3 text-lg"> / {STAGES.length}</span>
          </span>
        </p>
      </div>

      <p className="eyebrow mt-8">
        {direct ? "Reading GitHub from your browser" : "Reading from GitHub"}
      </p>
      <h1 className="display mt-3 text-[clamp(1.8rem,5vw,3rem)] break-words">
        {owner}/<em>{name}</em>
      </h1>

      <ol
        className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        aria-live="polite"
      >
        {STAGES.map((stage, i) => {
          const detail = done[stage.id];
          const isDone = detail !== undefined;
          // The repository is checked first; everything else is then read in parallel.
          const isLast = i === STAGES.length - 1;
          const active =
            !isDone &&
            (i === 0 || (found && (!isLast || finished === STAGES.length - 1)));
          const result = isDone ? headline(detail) : null;
          return (
            <li
              key={stage.id}
              className={`card flex flex-col items-center gap-3 p-4 transition-all duration-500 ${
                isDone ? "border-accent/50" : active ? "" : "opacity-40"
              }`}
            >
              <span
                className={`grid size-10 place-items-center rounded-full transition-colors duration-500 ${
                  isDone ? "bg-accent text-accent-ink" : "bg-bg-3 text-ink-2"
                } ${active ? "stage-pulse" : ""}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={isDone ? "M5 12.5 10 17 19 7.5" : stage.icon} />
                </svg>
              </span>
              <span className="text-sm leading-tight">{stage.label}</span>
              <span className="text-ink-2 min-h-10 text-xs leading-tight">
                {result ? (
                  result.figure ? (
                    <>
                      <strong className="text-ink block text-lg font-medium">
                        {result.figure}
                      </strong>
                      {result.rest}
                    </>
                  ) : (
                    result.rest
                  )
                ) : active ? (
                  "reading…"
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ReportLoader({ owner, name }: { owner: string; name: string }) {
  const [state, setState] = useState<State>({ status: "loading", done: {} });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fail = (error?: ReportError) =>
      setState({
        status: "error",
        error: error ?? {
          code: "unavailable",
          title: "Preparing this report",
          message:
            "This one is taking longer than usual. Leave the page open and it will fill in on its own.",
        },
      });

    async function run() {
      setState({ status: "loading", done: {} });
      const res = await fetch(
        `/api/analyze?repo=${encodeURIComponent(`${owner}/${name}`)}`,
        {
          signal: controller.signal,
        },
      );
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        return fail(body?.error);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as AnalysisEvent;
          if (event.type === "stage") {
            setState((prev) =>
              prev.status === "loading"
                ? {
                    status: "loading",
                    done: { ...prev.done, [event.stage]: event.detail },
                  }
                : prev,
            );
          } else if (event.type === "result") {
            finished = true;
            setState({ status: "ready", report: event.report });
          } else if (event.error.code === "rate_limited") {
            finished = true;
            await direct();
          } else {
            finished = true;
            fail(event.error);
          }
        }
      }
      if (!finished) fail();
    }

    // Our server shares one GitHub allowance between all visitors. When it runs out,
    // this browser asks GitHub itself, which draws on the visitor's own allowance.
    async function direct() {
      setState({ status: "loading", done: {}, direct: true });
      const [{ analyzeRepository, toReportError }, { createGitHubClient }] =
        await Promise.all([import("@/lib/report/run"), import("@/lib/github/client")]);
      try {
        const report = await analyzeRepository(
          { owner, name },
          createGitHubClient(),
          (stage, detail) => {
            if (controller.signal.aborted) return;
            setState((prev) =>
              prev.status === "loading"
                ? { ...prev, done: { ...prev.done, [stage]: detail } }
                : prev,
            );
          },
        );
        if (!controller.signal.aborted) setState({ status: "ready", report });
      } catch (error) {
        if (!controller.signal.aborted) fail(toReportError(error));
      }
    }

    run().catch((error) => {
      if (error?.name !== "AbortError") fail();
    });
    return () => controller.abort();
  }, [owner, name, attempt]);

  // Anything short of "this repository does not exist" is retried quietly, with a
  // growing pause, so the visitor never has to do it by hand.
  const waiting = state.status === "error" && state.error.code !== "not_found";
  useEffect(() => {
    if (!waiting) return;
    const seconds = Math.min(300, 30 * 2 ** Math.min(attempt, 4));
    const timer = setTimeout(() => setAttempt((n) => n + 1), seconds * 1000);
    return () => clearTimeout(timer);
  }, [waiting, attempt]);

  if (state.status === "ready") return <ReportView report={state.report} />;

  if (state.status === "error" && waiting) {
    return (
      <div className="shell py-20 md:py-28" aria-live="polite">
        <p className="eyebrow">
          github.com/{owner}/{name}
        </p>
        <h1 className="display mt-5 text-[clamp(2.2rem,6vw,3.5rem)]">
          Preparing <em>this report.</em>
        </h1>
        <p className="text-ink-2 mt-5 max-w-xl text-lg">{state.error.message}</p>
        <div className="bg-bg-3 mt-8 h-1 max-w-sm overflow-hidden rounded-full">
          <div className="stage-pulse bg-accent h-full w-1/3 rounded-full" />
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Check now
          </button>
          <Link href="/explore" className="btn btn-ghost">
            Browse measured repositories
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="shell py-20 md:py-28">
        <p className="eyebrow !text-danger">{state.error.code.replace("_", " ")}</p>
        <h1 className="display mt-5 text-[clamp(2.4rem,6vw,4rem)]">
          {state.error.title}
        </h1>
        <p className="text-ink-2 mt-5 max-w-xl text-lg">{state.error.message}</p>
        <p className="text-ink-3 mt-3 font-mono text-sm">
          github.com/{owner}/{name}
        </p>
        <div className="mt-10 max-w-2xl">
          <RepoInput defaultValue={`https://github.com/${owner}/${name}`} />
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          {state.error.code !== "not_found" ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </button>
          ) : null}
          <Link href="/repo/OpenPrinting/cups" className="btn btn-ghost">
            See the example report
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Progress
      owner={owner}
      name={name}
      done={state.done}
      direct={state.direct === true}
    />
  );
}
