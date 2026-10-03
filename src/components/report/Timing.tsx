"use client";

import { useMemo, useSyncExternalStore } from "react";
import { busiest, toLocalGrid, WEEKDAYS } from "@/lib/analysis/rhythm";
import { Heatmap } from "./charts";

const hour = (h: number) => `${String(h).padStart(2, "0")}:00`;
const subscribe = () => () => {};

function zoneName(offset: number): string {
  if (offset === 0) return "UTC";
  const minutes = Math.abs(offset) % 60;
  return `UTC${offset > 0 ? "+" : "−"}${Math.floor(Math.abs(offset) / 60)}${
    minutes ? `:${String(minutes).padStart(2, "0")}` : ""
  }`;
}

/**
 * When the project's team comments, hour by hour across the week, in the viewer's own
 * time zone. Always the whole team pooled, never one person.
 */
export function Timing({
  slots,
  total,
  people,
}: {
  slots: number[];
  total: number;
  people: number;
}) {
  // The server renders in UTC; the browser switches to the viewer's zone on hydration.
  const offset = useSyncExternalStore(
    subscribe,
    () => -new Date().getTimezoneOffset(),
    () => 0,
  );
  const grid = useMemo(() => toLocalGrid(slots, offset), [slots, offset]);
  const peak = useMemo(() => busiest(grid), [grid]);
  const zone = zoneName(offset);

  return (
    <div>
      <p className="mb-8 max-w-2xl text-lg">
        Replies from the project are most likely on{" "}
        <strong className="font-medium">{peak.day}s</strong>, around{" "}
        <strong className="font-medium">
          {hour(peak.from)}–{hour(peak.to)}
        </strong>{" "}
        <span className="text-ink-2">your time ({zone}).</span>
      </p>
      <Heatmap
        grid={grid}
        days={WEEKDAYS}
        label={`Team comments by weekday and hour in ${zone}. Busiest on ${peak.day}s between ${hour(peak.from)} and ${hour(peak.to)}.`}
      />
      <p className="text-ink-3 mt-3 text-xs">
        Based on {total.toLocaleString("en-US")} comments from {people} team members,
        counted together. Each square is one hour. Never shown per person.
      </p>
    </div>
  );
}
