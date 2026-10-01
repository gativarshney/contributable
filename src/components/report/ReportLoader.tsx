"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AnalysisEvent, Report, ReportError, StageId } from "@/lib/report/run";
import { RepoInput } from "@/components/site/RepoInput";
import { ReportView } from "./ReportView";

const STAGES: { id: StageId; label: string }[] = [
  { id: "repository", label: "Connecting to GitHub" },
  { id: "commits", label: "Reading commit history" },
  { id: "contributors", label: "Reading contributors" },
  { id: "releases", label: "Reading release history" },
  { id: "issues", label: "Reading issues and pull requests" },
  { id: "contributing", label: "Reading contributor signals" },
  { id: "report", label: "Building engineering report" },
];

type State =
  | { status: "loading"; done: Partial<Record<StageId, string>> }
  | { status: "ready"; report: Report }
  | { status: "error"; error: ReportError };

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
          title: "Analysis interrupted",
          message:
            "The connection dropped before the report was complete. Please try again.",
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
          } else {
            finished = true;
            fail(event.error);
          }
        }
      }
      if (!finished) fail();
    }

    run().catch((error) => {
      if (error?.name !== "AbortError") fail();
    });
    return () => controller.abort();
  }, [owner, name, attempt]);

  if (state.status === "ready") return <ReportView report={state.report} />;

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
          <Link href="/sample" className="btn btn-ghost">
            Read the example report
          </Link>
        </div>
      </div>
    );
  }

  const firstPending = STAGES.findIndex((stage) => !(stage.id in state.done));
  return (
    <div className="shell py-20 md:py-28">
      <p className="eyebrow">Analyzing</p>
      <h1 className="display mt-5 text-[clamp(2.2rem,6vw,4rem)] break-words">
        {owner}/<em>{name}</em>
      </h1>
      <ol className="border-hair mt-12 max-w-xl border-t" aria-live="polite">
        {STAGES.map((stage, i) => {
          const detail = state.done[stage.id];
          const done = detail !== undefined;
          // Fetches run in parallel once the repository is confirmed.
          const active =
            !done && (i === firstPending || ("repository" in state.done && i < 6));
          return (
            <li
              key={stage.id}
              className="border-hair flex items-baseline gap-4 border-b py-4"
            >
              <span
                aria-hidden="true"
                className={`w-4 font-mono text-sm ${done ? "text-accent" : "text-ink-3"}`}
              >
                {done ? (
                  "✓"
                ) : active ? (
                  <span className="pulse-dot inline-block">●</span>
                ) : (
                  "·"
                )}
              </span>
              <span className={done || active ? "text-ink" : "text-ink-3"}>
                {stage.label}
              </span>
              <span className="text-ink-2 ml-auto text-right font-mono text-xs">
                {done ? detail : active ? "in progress" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-ink-3 mt-6 max-w-xl text-sm">
        Each line is a real request to GitHub&rsquo;s public API. Nothing is stored.
      </p>
    </div>
  );
}
