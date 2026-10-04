"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Skyline } from "@/components/three/Skyline";

type Point = [
  id: string,
  replyHours: number,
  mergeRate: number,
  within48h: number | null,
  terms: string,
  pulls: number,
];

interface FieldData {
  total: number;
  points: Point[];
}

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);

/** A repository matches when every word typed appears in its languages, frameworks or topics. */
function matches(point: Point, query: string[]): boolean {
  return query.length > 0 && query.every((word) => point[4].includes(word));
}

const hoursText = (hours: number) =>
  hours < 48 ? `${Math.max(1, Math.round(hours))} h` : `${Math.round(hours / 24)} days`;

/**
 * The first screen: one question, and under it a skyline with one bar for every
 * measured repository. A taller bar answers a larger share of outside pull requests
 * within 48 hours. Typing a stack brings the repositories that use it forward, and
 * the best of them are listed as links, so the picture is never the only way in.
 */
export function Field({ chips, children }: { chips: string[]; children: ReactNode }) {
  const [data, setData] = useState<FieldData | null>(null);
  const [text, setText] = useState("");
  const query = useMemo(() => words(text), [text]);

  useEffect(() => {
    let alive = true;
    fetch("/api/v1/field")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: FieldData | null) => {
        if (alive && body) setData(body);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const points = useMemo(() => data?.points ?? [], [data]);
  // One bar per repository, in whole columns of seven.
  const bars = useMemo(
    () => points.slice(0, Math.floor(points.length / 7) * 7),
    [points],
  );
  const values = useMemo(() => bars.map((p) => Math.round((p[3] ?? 0) * 100)), [bars]);
  const lit = useMemo(() => bars.map((p) => matches(p, query)), [bars, query]);
  const matched = useMemo(
    () =>
      points
        .filter((p) => matches(p, query))
        .sort((a, b) => (b[3] ?? -1) - (a[3] ?? -1) || b[2] - a[2]),
    [points, query],
  );

  const toggle = (chip: string) => {
    const next = query.includes(chip)
      ? query.filter((w) => w !== chip)
      : [...query, chip];
    setText(next.join(", "));
  };
  const stack = query.join(", ");

  return (
    <section className="relative flex min-h-[calc(100svh-3.5rem)] flex-col overflow-hidden">
      <div className="hero-glow" aria-hidden="true" />
      {values.length > 0 ? (
        <Skyline
          values={values}
          lit={lit}
          anchor="bottom"
          reactive
          className="skyline-fade pointer-events-none absolute inset-x-0 bottom-0 h-[clamp(13rem,36svh,25rem)]"
        />
      ) : null}

      <div className="shell relative flex flex-col items-center pt-[clamp(2rem,7svh,6rem)] pb-[clamp(11rem,31svh,21rem)] text-center">
        {children}

        <form action="/match" className="mt-9 w-full max-w-xl text-left">
          <label htmlFor="home-stack" className="sr-only">
            What do you code in?
          </label>
          <div className="repo-input border-hair-strong bg-bg-2 flex items-center gap-1 rounded-full border p-1.5 pl-5">
            <svg
              viewBox="0 0 16 16"
              className="text-ink-3 size-[18px] shrink-0"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="m10.5 10.5 3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              id="home-stack"
              name="stack"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What do you code in?"
              className="placeholder:text-ink-3 h-11 min-w-0 flex-1 bg-transparent px-2 text-base outline-none"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <button className="btn shrink-0">
              Find projects <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="text-ink-3 mr-1 text-sm">Try</span>
          {chips.map((chip) => {
            const on = query.includes(chip);
            return (
              <button
                key={chip}
                type="button"
                onClick={() => toggle(chip)}
                aria-pressed={on}
                className={`min-h-8 rounded-full border px-3 font-mono text-xs transition-colors ${
                  on
                    ? "border-accent text-accent"
                    : "border-hair-strong text-ink-2 hover:text-ink hover:border-ink-3"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        <div className="mt-5 min-h-[4.5rem]" aria-live="polite">
          {query.length > 0 && data ? (
            <>
              <p className="text-ink-2 text-sm">
                {matched.length === 0
                  ? `No measured repository uses ${stack} yet.`
                  : `${matched.length.toLocaleString("en-US")} ${matched.length === 1 ? "repository uses" : "repositories use"} ${stack}. Best at answering:`}
              </p>
              <ul className="mt-2.5 flex flex-wrap justify-center gap-2 text-sm">
                {matched.slice(0, 3).map((point) => (
                  <li key={point[0]}>
                    <Link
                      href={`/repo/${point[0]}`}
                      className="border-hair-strong bg-bg/70 hover:border-accent inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 backdrop-blur transition-colors"
                    >
                      <span>{point[0]}</span>
                      <span className="num text-accent text-xs">
                        {hoursText(point[1])} · {Math.round(point[2] * 100)}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>

      {values.length > 0 ? (
        <p className="text-ink-3 pointer-events-none absolute inset-x-0 bottom-3 px-6 text-center text-[11px]">
          One bar per measured repository. Taller: more outside pull requests answered
          within 48 hours.
        </p>
      ) : null}
    </section>
  );
}
