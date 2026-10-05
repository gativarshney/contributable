import type { ReactNode } from "react";
import type { WeekPoint } from "@/core/trends";
import { count, duration, percent } from "@/lib/format";

/** Every chart carries the same figures as a table, one click away. */
export function TableView({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <details className="mt-3 text-sm">
      <summary className="text-ink-2 hover:text-ink cursor-pointer text-xs">
        Show as table
      </summary>
      <div className="mt-2 max-h-72 overflow-auto">
        <table className="data-table">
          <caption className="sr-only">{caption}</caption>
          {children}
        </table>
      </div>
    </details>
  );
}

/** Opened, replied, merged: how many outside pull requests reach each stage. */
export function Funnel({
  opened,
  replied,
  merged,
}: {
  opened: number;
  replied: number;
  merged: number;
}) {
  const stages = [
    { label: "Opened by outsiders", value: opened, color: "var(--ink-3)" },
    { label: "Got a human reply", value: replied, color: "var(--ink-2)" },
    { label: "Merged", value: merged, color: "var(--merged)" },
  ];
  return (
    <div>
      <ol
        className="space-y-2.5"
        aria-label={`Of ${opened} outside pull requests, ${replied} got a reply and ${merged} were merged`}
      >
        {stages.map((stage) => (
          <li key={stage.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span>{stage.label}</span>
              <span className="num">
                {count(stage.value)}
                <span className="text-ink-3 ml-2 text-xs">
                  {opened > 0 ? percent(stage.value / opened) : ""}
                </span>
              </span>
            </div>
            <div className="bg-bg-3 mt-1 h-2.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${opened > 0 ? Math.max(1.5, (stage.value / opened) * 100) : 0}%`,
                  background: stage.color,
                }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const CURVE_MAX_HOURS = 14 * 24;
const CURVE_TICKS = [
  [24, "1 day"],
  [48, "2 days"],
  [168, "1 week"],
  [336, "2 weeks"],
] as const;

/** Share of pull requests answered by a given time, read off the waiting curve. */
export function answeredBy(
  curve: { hours: number; waiting: number }[],
  hours: number,
): number {
  let waiting = 1;
  for (const step of curve) {
    if (step.hours > hours) break;
    waiting = step.waiting;
  }
  return 1 - waiting;
}

/**
 * Time to first reply: the share of outside pull requests that had a human reply by
 * each point in time. It climbs in steps; a curve that flattens low means many
 * pull requests never get an answer.
 */
export function ReplyCurve({ curve }: { curve: { hours: number; waiting: number }[] }) {
  const w = 560;
  const h = 200;
  const pad = { l: 36, r: 12, t: 10, b: 26 };
  const x = (hours: number) =>
    pad.l + (Math.min(hours, CURVE_MAX_HOURS) / CURVE_MAX_HOURS) * (w - pad.l - pad.r);
  const y = (share: number) => pad.t + (1 - share) * (h - pad.t - pad.b);

  let path = `M ${x(0)} ${y(0)}`;
  let answered = 0;
  for (const step of curve) {
    if (step.hours > CURVE_MAX_HOURS) break;
    path += ` H ${x(step.hours).toFixed(1)} V ${y(1 - step.waiting).toFixed(1)}`;
    answered = 1 - step.waiting;
  }
  path += ` H ${x(CURVE_MAX_HOURS)}`;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        role="img"
        aria-label={`Share of outside pull requests with a reply: ${CURVE_TICKS.map(
          ([hours, label]) => `${percent(answeredBy(curve, hours))} after ${label}`,
        ).join(", ")}`}
      >
        {[0, 0.5, 1].map((share) => (
          <g key={share}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={y(share)}
              y2={y(share)}
              stroke="var(--hair)"
            />
            <text
              x={pad.l - 6}
              y={y(share) + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--ink-3)"
              className="num"
            >
              {share * 100}%
            </text>
          </g>
        ))}
        {CURVE_TICKS.map(([hours, label]) => (
          <g key={hours}>
            <line
              x1={x(hours)}
              x2={x(hours)}
              y1={pad.t}
              y2={h - pad.b}
              stroke="var(--hair)"
              strokeDasharray="2 4"
            />
            <text
              x={x(hours)}
              y={h - 8}
              textAnchor={hours === CURVE_MAX_HOURS ? "end" : "middle"}
              fontSize="11"
              fill="var(--ink-3)"
            >
              {label}
            </text>
          </g>
        ))}
        <path d={`${path} V ${y(0)} H ${x(0)} Z`} fill="var(--fast)" opacity="0.12" />
        <path d={path} fill="none" stroke="var(--fast)" strokeWidth="2" />
        <circle cx={x(CURVE_MAX_HOURS)} cy={y(answered)} r="3.5" fill="var(--fast)" />
      </svg>
      <TableView caption="Share of outside pull requests with a human reply over time">
        <thead>
          <tr>
            <th scope="col">Time since opened</th>
            <th scope="col" className="right">
              Had a reply
            </th>
          </tr>
        </thead>
        <tbody>
          {CURVE_TICKS.map(([hours, label]) => (
            <tr key={hours}>
              <td>{label}</td>
              <td className="right num">{percent(answeredBy(curve, hours))}</td>
            </tr>
          ))}
        </tbody>
      </TableView>
    </figure>
  );
}

/** Fifty-two weeks of outside pull requests: opened, and of those how many merged. */
export function WeeklyBars({ series }: { series: WeekPoint[] }) {
  const w = 560;
  const h = 140;
  const pad = { t: 8, b: 18 };
  const max = Math.max(1, ...series.map((p) => p.opened));
  const band = w / series.length;
  const scale = (v: number) => (v / max) * (h - pad.t - pad.b);
  const total = series.reduce((sum, p) => sum + p.opened, 0);
  const merged = series.reduce((sum, p) => sum + p.merged, 0);
  return (
    <figure>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        role="img"
        aria-label={`Outside pull requests per week over a year: ${total} opened, ${merged} of them merged. Busiest week had ${max}.`}
      >
        <line x1="0" x2={w} y1={h - pad.b} y2={h - pad.b} stroke="var(--hair-strong)" />
        {series.map((point, i) => (
          <g key={point.week}>
            <rect
              x={i * band + 1}
              y={h - pad.b - scale(point.opened)}
              width={Math.max(1, band - 2)}
              height={scale(point.opened)}
              rx="1.5"
              fill="var(--bg-3)"
              stroke="var(--hair-strong)"
              strokeWidth="0.5"
            />
            <rect
              x={i * band + 1}
              y={h - pad.b - scale(point.merged)}
              width={Math.max(1, band - 2)}
              height={scale(point.merged)}
              rx="1.5"
              fill="var(--merged)"
            />
          </g>
        ))}
        <text x="0" y={h - 4} fontSize="11" fill="var(--ink-3)">
          {series[0]?.week}
        </text>
        <text x={w} y={h - 4} fontSize="11" fill="var(--ink-3)" textAnchor="end">
          this week
        </text>
      </svg>
      <figcaption className="text-ink-2 mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="border-hair-strong bg-bg-3 inline-block size-2.5 rounded-sm border"
            aria-hidden="true"
          />
          Opened <span className="num text-ink">{count(total)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="bg-merged inline-block size-2.5 rounded-sm"
            aria-hidden="true"
          />
          Merged so far <span className="num text-ink">{count(merged)}</span>
        </span>
        <span>Tallest bar: {max} in a week</span>
      </figcaption>
      <TableView caption="Outside pull requests opened and merged per week">
        <thead>
          <tr>
            <th scope="col">Week starting</th>
            <th scope="col" className="right">
              Opened
            </th>
            <th scope="col" className="right">
              Merged
            </th>
            <th scope="col" className="right">
              Reply within 7 days
            </th>
          </tr>
        </thead>
        <tbody>
          {[...series].reverse().map((point) => (
            <tr key={point.week}>
              <td className="num">{point.week}</td>
              <td className="right num">{point.opened}</td>
              <td className="right num">{point.merged}</td>
              <td className="right num">{point.answered7d}</td>
            </tr>
          ))}
        </tbody>
      </TableView>
    </figure>
  );
}

/**
 * Where one repository sits among all measured repositories, on a log scale of hours
 * (or a plain 0 to 100% scale). Each tick is a repository.
 */
export function PositionStrip({
  values,
  value,
  kind,
  label,
}: {
  values: number[];
  value: number | null;
  kind: "hours" | "share";
  label: string;
}) {
  if (value === null || values.length < 10) return null;
  const w = 320;
  const pos =
    kind === "share"
      ? (v: number) => v * w
      : (v: number) =>
          ((Math.log10(Math.max(0.5, Math.min(v, 2000))) + 0.301) / 3.602) * w;
  const better =
    kind === "share"
      ? values.filter((v) => v < value).length
      : values.filter((v) => v > value).length;
  // The repository itself is among the values, so it is compared with the others only.
  // Rounded down, so 99.8% never reads as "faster than 100%".
  const others = Math.max(1, values.length - 1);
  const first = better >= others;
  const shown = `${Math.floor((better / others) * 100)}%`;
  const summary = first
    ? `${kind === "hours" ? "The fastest" : "The highest"} of ${count(values.length)} measured repositories`
    : `${kind === "hours" ? "Faster" : "Higher"} than ${shown} of ${count(others)} other measured repositories`;
  // At most 300 ticks: enough to show the shape without weighing the page down.
  const stride = Math.ceil(values.length / 300);
  return (
    <div className="mt-3">
      <svg
        viewBox={`0 0 ${w} 22`}
        className="w-full max-w-xs"
        role="img"
        aria-label={`${label}: ${summary}`}
      >
        {values
          .filter((_, i) => i % stride === 0)
          .map((v, i) => (
            <line
              key={i}
              x1={pos(v)}
              x2={pos(v)}
              y1="7"
              y2="15"
              stroke="var(--ink-3)"
              opacity="0.28"
            />
          ))}
        <line
          x1={pos(value)}
          x2={pos(value)}
          y1="1"
          y2="21"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-ink-3 text-xs">
        {summary}
        {kind === "hours" ? ` (${duration(value)})` : ""}
      </p>
    </div>
  );
}
