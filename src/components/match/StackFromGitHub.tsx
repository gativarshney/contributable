"use client";

import { useRef, useState } from "react";
import {
  githubLogin,
  problemFromResponse,
  problemMessage,
  stackFromRepos,
  type LookupProblem,
  type PublicRepo,
} from "@/lib/match/github-stack";

type State =
  | { status: "idle" | "loading" }
  | { status: "done"; added: string[] }
  | { status: "problem"; problem: LookupProblem };

/**
 * Fills the stack field from a GitHub username's public repositories. The request goes
 * from the browser straight to GitHub; nothing is sent to or stored by this site, and
 * no sign-in is involved.
 */
export function StackFromGitHub({ target }: { target: string }) {
  // Read from the field itself rather than state, so a name typed before the page
  // finished loading is not lost.
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const fail = (problem: LookupProblem) => setState({ status: "problem", problem });

  async function fill() {
    const login = githubLogin(input.current?.value ?? "");
    if (!login) return fail({ kind: "invalid" });
    setState({ status: "loading" });
    try {
      const response = await fetch(
        `https://api.github.com/users/${login}/repos?per_page=100&sort=pushed`,
        { headers: { accept: "application/vnd.github+json" } },
      );
      if (!response.ok) {
        return fail(
          problemFromResponse(
            response.status,
            response.headers.get("x-ratelimit-remaining"),
            response.headers.get("x-ratelimit-reset"),
          ),
        );
      }
      const top = stackFromRepos((await response.json()) as PublicRepo[]);
      const field = document.getElementById(target) as HTMLInputElement | null;
      if (!field || top.length === 0) return fail({ kind: "empty" });
      const existing = field.value
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      field.value = [...new Set([...existing, ...top])].join(", ");
      setState({ status: "done", added: top.filter((l) => !existing.includes(l)) });
    } catch {
      fail({ kind: "unavailable" });
    }
  }

  const note =
    state.status === "done"
      ? state.added.length > 0
        ? `Added ${state.added.join(", ")} from your own repositories.`
        : "Your languages were already in the list."
      : state.status === "problem"
        ? problemMessage(state.problem)
        : "Reads your public repositories from your browser. No sign-in, nothing stored.";

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">GitHub username</span>
          <input
            ref={input}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void fill();
              }
            }}
            placeholder="GitHub username (optional)"
            className="field"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </label>
        <button
          type="button"
          className="btn btn-ghost shrink-0"
          onClick={fill}
          disabled={state.status === "loading"}
        >
          {state.status === "loading" ? "Reading" : "Fill my stack"}
        </button>
      </div>
      <p
        className={`mt-1.5 text-xs ${state.status === "problem" ? "text-slow" : "text-ink-3"}`}
        aria-live="polite"
      >
        {note}
      </p>
    </div>
  );
}
