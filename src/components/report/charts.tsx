import { fmt } from "./format";

export interface Segment {
  label: string;
  value: number;
  /** A background utility class for the mark, e.g. "bg-cat-1". */
  color: string;
  /** CSS colour for SVG marks; needed by the donut only. */
  stroke?: string;
}

const pct = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

/** A single ratio against a limit, drawn as a ring with the figure in the middle. */
export function Ring({
  value,
  total,
  size = 176,
  label,
}: {
  value: number;
  total: number;
  size?: number;
  label: string;
}) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = total > 0 ? (value / total) * circumference : 0;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90">
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
          strokeDasharray={`${filled} ${circumference}`}
          className="stroke-accent ring-draw"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <p className="text-[3.25rem] leading-none font-medium tracking-tight">
          {value}
          <span className="text-ink-3 text-2xl"> / {total}</span>
        </p>
      </div>
    </div>
  );
}

/** Part-to-whole on one line: segments in a fixed order, every value in the legend. */
export function StackedBar({ segments, label }: { segments: Segment[]; label: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div>
      <div
        className="flex h-4 gap-0.5"
        role="img"
        aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`}
      >
        {total === 0 ? (
          <span className="bg-bg-3 h-full flex-1 rounded-sm" />
        ) : (
          visible.map((segment, i) => (
            <span
              key={segment.label}
              title={`${segment.label}: ${segment.value} (${pct(segment.value, total)}%)`}
              style={{ flexGrow: segment.value, flexBasis: 0 }}
              className={`h-full min-w-1 ${segment.color} ${i === 0 ? "rounded-l-sm" : ""} ${
                i === visible.length - 1 ? "rounded-r-sm" : ""
              }`}
            />
          ))
        )}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {(total === 0 ? segments : visible).map((segment) => (
          <li key={segment.label} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={`size-2.5 shrink-0 rounded-[3px] ${segment.color}`}
            />
            <span className="text-ink-2">{segment.label}</span>
            <span className="font-medium">{fmt(segment.value)}</span>
            {total > 0 ? (
              <span className="text-ink-3 text-xs">{pct(segment.value, total)}%</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Share of a whole across a few named parts. The legend is rendered by the caller. */
export function Donut({
  segments,
  size = 168,
  label,
  children,
}: {
  segments: Segment[];
  size?: number;
  label: string;
  children?: React.ReactNode;
}) {
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const gap = 2; // surface-coloured gap between neighbouring segments
  let offset = 0;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${segments.map((s) => `${s.label} ${pct(s.value, total)}%`).join(", ")}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        {total === 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-bg-3"
          />
        ) : (
          segments
            .filter((s) => s.value > 0)
            .map((segment) => {
              const length = (segment.value / total) * circumference;
              const dash = Math.max(1, length - gap);
              const circle = (
                <circle
                  key={segment.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={stroke}
                  stroke={segment.stroke}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                >
                  <title>{`${segment.label}: ${pct(segment.value, total)}%`}</title>
                </circle>
              );
              offset += length;
              return circle;
            })
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children}
      </div>
    </div>
  );
}

/** Columns over time. The peak and the latest value are labelled; the axis carries the rest. */
export function Columns({
  data,
  label,
  unit,
}: {
  data: { label: string; value: number }[];
  label: string;
  unit: string;
}) {
  const peak = Math.max(1, ...data.map((d) => d.value));
  const peakIndex = data.findIndex((d) => d.value === peak);
  const last = data.length - 1;
  return (
    <figure>
      <div
        className="border-hair flex h-44 items-end gap-1.5 border-b sm:gap-3"
        role="img"
        aria-label={`${label}. ${data.map((d) => `${d.label}: ${d.value}`).join("; ")}`}
      >
        {data.map((d, i) => (
          <div
            key={d.label}
            title={`${d.label}: ${d.value} ${unit}`}
            className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
          >
            <span
              className={`text-ink-2 mb-1.5 text-xs ${
                i === peakIndex || i === last ? "" : "opacity-0 group-hover:opacity-100"
              } transition-opacity`}
            >
              {d.value}
            </span>
            <span
              className={`w-full max-w-6 rounded-t-[4px] transition-colors ${
                i === last ? "bg-accent" : "bg-accent/45 group-hover:bg-accent"
              }`}
              style={{
                height: `${(d.value / peak) * 78}%`,
                minHeight: d.value > 0 ? 3 : 0,
              }}
            />
          </div>
        ))}
      </div>
      <div className="text-ink-3 mt-2 flex justify-between text-xs">
        <span>{data[0]?.label}</span>
        <span>{data[last]?.label}</span>
      </div>
    </figure>
  );
}

const HOUR_TICKS = [0, 6, 12, 18];

/** A week by hour grid. Darker means more; every cell carries its value for assistive tech. */
export function Heatmap({
  grid,
  days,
  label,
}: {
  /** Counts indexed as hour * 7 + weekday. */
  grid: number[];
  days: string[];
  label: string;
}) {
  const peak = Math.max(1, ...grid);
  // Monday first: it matches how most people picture a working week.
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <figure>
      <div role="img" aria-label={label} className="overflow-x-auto">
        <div className="min-w-[560px]">
          {order.map((weekday) => (
            <div key={weekday} className="mb-1 flex items-center gap-3">
              <span className="text-ink-2 w-9 shrink-0 text-xs">
                {days[weekday].slice(0, 3)}
              </span>
              <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-1">
                {Array.from({ length: 24 }, (_, hour) => {
                  const value = grid[hour * 7 + weekday];
                  const level = value === 0 ? 0 : 0.18 + 0.82 * (value / peak);
                  return (
                    <span
                      key={hour}
                      title={`${days[weekday]} ${String(hour).padStart(2, "0")}:00 · ${value} comment${value === 1 ? "" : "s"}`}
                      className="bg-bg-3 relative aspect-square overflow-hidden rounded-[3px]"
                    >
                      <span
                        className="bg-accent absolute inset-0"
                        style={{ opacity: level }}
                      />
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-2 flex items-center gap-3">
            <span className="w-9 shrink-0" />
            <div className="text-ink-3 grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-1 text-xs">
              {Array.from({ length: 24 }, (_, hour) => (
                <span key={hour} className="whitespace-nowrap">
                  {HOUR_TICKS.includes(hour) ? `${String(hour).padStart(2, "0")}:00` : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-ink-3 mt-4 flex items-center gap-2 text-xs">
        Fewer
        <span className="flex gap-1" aria-hidden="true">
          {[0.18, 0.45, 0.72, 1].map((opacity) => (
            <span
              key={opacity}
              className="bg-bg-3 relative size-3 overflow-hidden rounded-[3px]"
            >
              <span className="bg-accent absolute inset-0" style={{ opacity }} />
            </span>
          ))}
        </span>
        More replies
      </figcaption>
    </figure>
  );
}
