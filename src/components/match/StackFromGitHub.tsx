"use client";

import { useState } from "react";

/**
 * Fills the stack field from a GitHub username's public repositories. The request goes
 * from the browser straight to GitHub; nothing is sent to or stored by this site, and
 * no sign-in is involved.
 */
export function StackFromGitHub({ target }: { target: string }) {
  const [user, setUser] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "none">("idle");

  async function fill() {
    const login = user.trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9-]{1,39}$/.test(login)) return setState("none");
    setState("loading");
    try {
      const response = await fetch(
        `https://api.github.com/users/${login}/repos?per_page=100&sort=pushed`,
        { headers: { accept: "application/vnd.github+json" } },
      );
      if (!response.ok) return setState("none");
      const repos = (await response.json()) as {
        language: string | null;
        fork: boolean;
      }[];
      const counts = new Map<string, number>();
      for (const repo of repos) {
        if (repo.fork || !repo.language) continue;
        counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
      }
      const top = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([language]) => language.toLowerCase());
      const field = document.getElementById(target) as HTMLInputElement | null;
      if (!field || top.length === 0) return setState("none");
      const existing = field.value
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      field.value = [...new Set([...existing, ...top])].join(", ");
      setState("done");
    } catch {
      setState("none");
    }
  }

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">GitHub username</span>
          <input
            value={user}
            onChange={(event) => setUser(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void fill();
              }
            }}
            placeholder="GitHub username (optional)"
            className="field"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          className="btn btn-ghost shrink-0"
          onClick={fill}
          disabled={state === "loading"}
        >
          {state === "loading" ? "Reading" : "Fill my stack"}
        </button>
      </div>
      <p className="text-ink-3 mt-1.5 text-xs" aria-live="polite">
        {state === "done"
          ? "Added the languages of your public repositories."
          : state === "none"
            ? "Could not read public repositories for that username. Type your stack instead."
            : "Reads your public repositories from your browser. No sign-in, nothing stored."}
      </p>
    </div>
  );
}
