"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Skyline } from "@/components/three/Skyline";
import { busiest, toLocalGrid, WEEKDAYS } from "@/lib/analysis/rhythm";

const hour = (h: number) => `${String(h).padStart(2, "0")}:00`;
const subscribe = () => () => {};

/** The team's weekly comment pattern as a 3D field: 24 hours across, 7 weekdays deep. */
export function Rhythm({
  slots,
  total,
  className = "h-[clamp(240px,34vw,400px)]",
}: {
  slots: number[];
  total: number;
  className?: string;
}) {
  // The server renders in UTC; the browser switches to the viewer's zone on hydration.
  const offset = useSyncExternalStore(
    subscribe,
    () => -new Date().getTimezoneOffset(),
    () => 0,
  );
  const grid = useMemo(() => toLocalGrid(slots, offset), [slots, offset]);
  const peak = useMemo(() => busiest(grid), [grid]);
  const tooltip = useCallback(
    (index: number, value: number) =>
      `${WEEKDAYS[index % 7].slice(0, 3)} ${hour(Math.floor(index / 7))} · ${value} comment${value === 1 ? "" : "s"}`,
    [],
  );
  const minutes = Math.abs(offset) % 60;
  const zone =
    offset === 0
      ? "UTC"
      : `UTC${offset > 0 ? "+" : "−"}${Math.floor(Math.abs(offset) / 60)}${
          minutes ? `:${String(minutes).padStart(2, "0")}` : ""
        }`;

  return (
    <figure>
      <Skyline
        values={grid}
        interactive
        tooltip={tooltip}
        label={`When the team comments, by weekday and hour. Busiest on ${peak.day}s between ${hour(peak.from)} and ${hour(peak.to)} ${zone}.`}
        className={`w-full ${className}`}
      />
      <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <p className="text-[15px]">
          Busiest on <strong className="font-medium">{peak.day}s</strong>, between{" "}
          <strong className="font-medium">
            {hour(peak.from)} and {hour(peak.to)}
          </strong>{" "}
          <span className="text-ink-2">({zone}, your time zone)</span>
        </p>
        <p className="text-ink-3 font-mono text-[11px]">
          {total.toLocaleString("en-US")} team comments · hover a bar to read it, drag to
          turn
        </p>
      </figcaption>
    </figure>
  );
}
