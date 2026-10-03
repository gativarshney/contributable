"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Point = [
  id: string,
  replyHours: number,
  mergeRate: number,
  within48h: number | null,
  terms: string,
];

interface FieldData {
  total: number;
  points: Point[];
}

/** Reply time runs on a log scale from 1 hour to 60 days; faster is further right. */
const MIN_HOURS = 1;
const MAX_HOURS = 60 * 24;
const xOf = (hours: number) =>
  1 -
  Math.log(Math.min(MAX_HOURS, Math.max(MIN_HOURS, hours)) / MIN_HOURS) /
    Math.log(MAX_HOURS / MIN_HOURS);

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);

/** A repository matches when every word typed appears in its languages, frameworks or topics. */
function matches(point: Point, query: string[]): boolean {
  return query.length > 0 && query.every((word) => point[4].includes(word));
}

function hoursText(hours: number): string {
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} days`;
}

/**
 * Every measured repository as a point: first reply speed across, outside merge rate
 * up. Typing a stack lights up the repositories that use it. The same result is given
 * as text and links below, so the picture is never the only way in.
 */
export function Field() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const levels = useRef<Float32Array | null>(null);
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

  const matched = useMemo(
    () =>
      data
        ? data.points
            .filter((p) => matches(p, query))
            .sort((a, b) => (b[3] ?? -1) - (a[3] ?? -1) || b[2] - a[2])
        : [],
    [data, query],
  );

  useEffect(() => {
    const el = canvas.current;
    if (!el || !data) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const points = data.points;
    const lit = points.map((p) => matches(p, query));
    // Each point eases between dim and lit; `level` holds where it is now and is
    // kept between keystrokes, so a point that stays lit does not flicker.
    if (!levels.current || levels.current.length !== points.length) {
      levels.current = new Float32Array(points.length);
    }
    const level = levels.current;
    let raf = 0;
    let width = 0;
    let height = 0;

    const colours = () => {
      const style = getComputedStyle(document.documentElement);
      return {
        dot: style.getPropertyValue("--ink-3").trim(),
        accent: style.getPropertyValue("--accent").trim(),
      };
    };
    let colour = colours();

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = el.clientWidth;
      height = el.clientHeight;
      el.width = Math.round(width * ratio);
      el.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const pad = 14;
      const searching = query.length > 0;
      let moving = false;
      for (let pass = 0; pass < 2; pass += 1) {
        for (let i = 0; i < points.length; i += 1) {
          // Lit points are drawn last so they sit on top.
          if ((pass === 1) !== lit[i]) continue;
          const target = lit[i] ? 1 : 0;
          if (reduce) level[i] = target;
          else if (Math.abs(level[i] - target) > 0.01) {
            level[i] += (target - level[i]) * 0.16;
            moving = true;
          } else level[i] = target;
          const t = level[i];
          const x = pad + xOf(points[i][1]) * (width - pad * 2);
          // A lit point rises a little, the "best matches rise" of the brief.
          const y = pad + (1 - points[i][2]) * (height - pad * 2) - t * 6;
          if (t > 0.02) {
            ctx.globalAlpha = 0.16 * t;
            ctx.fillStyle = colour.accent;
            ctx.beginPath();
            ctx.arc(x, y, 3 + 7 * t, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = t > 0.02 ? 0.35 + 0.65 * t : searching ? 0.14 : 0.4;
          ctx.fillStyle = t > 0.5 ? colour.accent : colour.dot;
          ctx.beginPath();
          ctx.arc(x, y, 1.6 + 1.6 * t, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (moving) raf = requestAnimationFrame(draw);
    };

    const redraw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };
    const onResize = () => {
      resize();
      redraw();
    };
    const theme = new MutationObserver(() => {
      colour = colours();
      redraw();
    });

    resize();
    redraw();
    window.addEventListener("resize", onResize);
    theme.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      theme.disconnect();
    };
  }, [data, query]);

  const stack = text.trim();

  return (
    <div>
      <form action="/match" className="mx-auto w-full max-w-xl">
        <label htmlFor="home-stack" className="sr-only">
          What do you code in?
        </label>
        <div className="repo-input border-hair-strong bg-bg flex items-center gap-2 rounded-full border p-1.5 pl-5">
          <input
            id="home-stack"
            name="stack"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="What do you code in? python, react, rust"
            className="placeholder:text-ink-3 h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <button className="btn shrink-0">Find projects</button>
        </div>
      </form>

      <p className="text-ink-2 mt-4 min-h-6 text-center text-sm" aria-live="polite">
        {!data
          ? "Loading the index"
          : data.points.length === 0
            ? "The index is being prepared. Points appear here as repositories are measured."
            : query.length === 0
              ? `${data.points.length.toLocaleString("en-US")} repositories, each a point. Type a language to light yours up.`
              : matched.length === 0
                ? `No measured repository uses "${stack}" yet.`
                : `${matched.length.toLocaleString("en-US")} ${matched.length === 1 ? "repository uses" : "repositories use"} ${stack}.`}
      </p>

      <div className="relative mx-auto mt-3 max-w-4xl">
        <canvas
          ref={canvas}
          role="img"
          aria-label={
            data
              ? `${data.points.length} repositories plotted by first reply time and outside merge rate. Faster replies are to the right, higher merge rates at the top.`
              : "Loading"
          }
          className="h-[clamp(11rem,34svh,20rem)] w-full"
        />
        <span className="text-ink-3 pointer-events-none absolute right-1 bottom-0 text-[11px]">
          Faster first reply →
        </span>
        <span className="text-ink-3 pointer-events-none absolute top-0 left-1 text-[11px]">
          ↑ More outside PRs merged
        </span>
      </div>

      <ul className="mx-auto mt-3 flex min-h-8 max-w-3xl flex-wrap justify-center gap-2 text-sm">
        {matched.slice(0, 4).map((point) => (
          <li key={point[0]}>
            <Link
              href={`/repo/${point[0]}`}
              className="border-hair-strong hover:border-accent inline-flex min-h-9 items-center gap-2 rounded-full border px-3 transition-colors"
            >
              <span>{point[0]}</span>
              <span className="num text-ink-3 text-xs">
                {hoursText(point[1])} · {Math.round(point[2] * 100)}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
