import Link from "next/link";
import type { IndexRow } from "@/core/published";
import { compact, duration } from "@/lib/format";

/** How many of the most starred repositories the comparison is drawn from. */
const FAMOUS = 20;
/** Enough outside pull requests that a median is not luck. */
const SOLID = 20;
const TRACK_DAYS = 14;
/** Below this outside merge rate a project is taken not to review on GitHub. */
const MIN_MERGE_RATE = 0.3;

/**
 * The two ends of the famous: among the most starred repositories with a solid sample,
 * the one that replies slowest and the one that replies fastest.
 */
export function famousPair(rows: readonly IndexRow[]) {
  const famous = rows
    // A project that merges almost nothing on GitHub reviews somewhere else (a mailing
    // list, say). Calling it slow would be wrong, so it is left out of the comparison.
    .filter(
      (r) =>
        r.replyHours !== null &&
        r.replyN >= SOLID &&
        r.mergeRate !== null &&
        r.mergeRate >= MIN_MERGE_RATE,
    )
    .sort((a, b) => b.stars - a.stars)
    .slice(0, FAMOUS);
  if (famous.length < 4) return null;
  const byWait = [...famous].sort((a, b) => a.replyHours! - b.replyHours!);
  return { fast: byWait[0], slow: byWait[byWait.length - 1], pool: famous.length };
}

function Wait({ row, tone }: { row: IndexRow; tone: "slow" | "fast" }) {
  const days = row.replyHours! / 24;
  const share = Math.min(1, days / TRACK_DAYS);
  const colour = tone === "fast" ? "var(--accent)" : "var(--slow)";
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Link href={`/repo/${row.id}`} className="link text-lg font-medium">
          {row.id}
        </Link>
        <span className="text-ink-3 num text-sm">{compact(row.stars)} stars</span>
      </div>
      <div
        className="relative mt-4 h-12"
        role="img"
        aria-label={`${row.id}: the first reply to an outside pull request usually comes after ${duration(row.replyHours)}`}
      >
        {/* The fortnight after a pull request is opened. */}
        <div className="bg-bg-3 absolute inset-x-0 top-5 h-1.5 rounded-full" />
        <div
          className="absolute top-5 left-0 h-1.5 rounded-full"
          style={{ width: `${Math.max(1.5, share * 100)}%`, background: colour }}
        />
        <span
          className="border-bg absolute top-[13px] left-0 size-5 -translate-x-1/2 rounded-full border-4"
          style={{ background: "var(--ink-2)" }}
        />
        <span
          className="border-bg absolute top-[13px] size-5 -translate-x-1/2 rounded-full border-4"
          style={{ left: `${Math.max(1.5, share * 100)}%`, background: colour }}
        />
        <span
          className="num absolute top-9 text-sm font-medium whitespace-nowrap"
          style={{
            left: `${Math.max(1.5, share * 100)}%`,
            transform:
              share > 0.8
                ? "translateX(-100%)"
                : share < 0.1
                  ? "none"
                  : "translateX(-50%)",
            color: colour,
          }}
        >
          reply after {duration(row.replyHours)}
        </span>
      </div>
    </div>
  );
}

/** Ten dots, some filled: a share you can count. */
function Dots({ share }: { share: number }) {
  const filled = Math.round(share * 10);
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className="size-3.5 rounded-full"
          style={{ background: i < filled ? "var(--accent)" : "var(--bg-3)" }}
        />
      ))}
    </div>
  );
}

/** Replies by hour of day as a strip of 24 cells, shifted to India time. */
function Hours({ hours }: { hours: number[] }) {
  // The profile is in UTC; India is five and a half hours ahead, shown to the hour.
  const shifted = hours.map((_, h) => hours[(h + 24 - 6) % 24]);
  return (
    <div aria-hidden="true">
      <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[3px]">
        {shifted.map((value, h) => (
          <span
            key={h}
            className="h-7 rounded-[3px]"
            style={{
              background:
                value === 0
                  ? "var(--bg-3)"
                  : `color-mix(in oklch, var(--accent) ${20 + value * 9}%, var(--bg-3))`,
            }}
          />
        ))}
      </div>
      <div className="text-ink-3 num mt-1.5 flex justify-between text-[11px]">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col p-6">
      <p className="eyebrow">{label}</p>
      <p className="mt-4 text-[2.5rem] leading-none font-medium tracking-tight">
        {value}
      </p>
      <div className="mt-6 flex-1">{children}</div>
      <p className="text-ink-2 mt-5 text-sm">{note}</p>
    </div>
  );
}

/**
 * What the site is for, shown rather than said: the same pull request waiting at two
 * famous projects.
 */
export function Story({ rows }: { rows: readonly IndexRow[] }) {
  const pair = famousPair(rows);
  if (!pair) return null;

  return (
    <section className="border-hair border-t py-20 md:py-28">
      <div className="shell">
        <p className="eyebrow">Why it matters</p>
        <h2 className="display mt-5 max-w-3xl text-[clamp(2rem,4.6vw,3.25rem)]">
          Same pull request. <em>Very different wait.</em>
        </h2>
        <p className="text-ink-2 mt-5 max-w-xl text-lg">
          Two of the {pair.pool} most starred projects that merge outside pull requests on
          GitHub. Stars tell you neither.
        </p>
        <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Wait row={pair.slow} tone="slow" />
          <Wait row={pair.fast} tone="fast" />
        </div>
        <p className="text-ink-3 mt-6 text-xs">
          Median wait for a first human reply on pull requests from outside the team,
          across {pair.slow.replyN} and {pair.fast.replyN} pull requests. The track is{" "}
          {TRACK_DAYS} days long.
        </p>
      </div>
    </section>
  );
}

/**
 * The four things measured for every repository, each as a small picture, using one
 * real repository as the example.
 */
export function FourThings({ rows }: { rows: readonly IndexRow[] }) {
  const pair = famousPair(rows);
  if (!pair) return null;
  const example = pair.fast;
  const issues = rows.reduce((sum, r) => sum + r.available, 0);

  return (
    <section className="border-hair border-t py-20 md:py-28">
      <div className="shell">
        <p className="eyebrow">What you get</p>
        <h2 className="display mt-5 max-w-3xl text-[clamp(2rem,4.6vw,3.25rem)]">
          Four things, <em>for every project.</em>
        </h2>
        <p className="text-ink-2 mt-5 text-lg">
          Shown here for{" "}
          <Link href={`/repo/${example.id}`} className="link text-ink">
            {example.id}
          </Link>
          .
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="First reply"
            value={duration(example.replyHours)}
            note="How long until a person answers your pull request."
          >
            <svg viewBox="0 0 200 56" className="w-full" aria-hidden="true">
              <path
                d="M0 54 C 10 20, 30 10, 70 7 S 160 4, 200 3"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path d="M0 55 H200" stroke="var(--hair-strong)" />
            </svg>
          </Tile>
          <Tile
            label="Merged"
            value={`${Math.round(example.mergeRate! * 10)} in 10`}
            note="How many outside pull requests end up merged."
          >
            {example.mergeRate !== null ? <Dots share={example.mergeRate} /> : null}
          </Tile>
          <Tile
            label="Free first issues"
            value={String(issues)}
            note="Across the index: open, unclaimed, no pull request yet."
          >
            <ul className="space-y-1.5 text-xs" aria-hidden="true">
              {[
                ["Available", "var(--accent)"],
                ["Claimed", "var(--slow)"],
                ["Has a pull request", "var(--ink-3)"],
              ].map(([state, colour]) => (
                <li key={state} className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: colour }} />
                  <span className="bg-bg-3 h-2 flex-1 rounded-full" />
                  <span className="text-ink-3 w-28">{state}</span>
                </li>
              ))}
            </ul>
          </Tile>
          <Tile
            label="Reply hours"
            value="Your time"
            note="When maintainers usually reply, shown in India time."
          >
            {example.hours ? (
              <Hours hours={example.hours} />
            ) : (
              <p className="text-ink-3 text-sm">Shown when 3 or more people reply.</p>
            )}
          </Tile>
        </div>
      </div>
    </section>
  );
}
