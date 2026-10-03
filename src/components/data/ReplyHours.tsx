"use client";

import { useMemo, useSyncExternalStore } from "react";
import { TableView } from "./charts";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** India Standard Time, used until the browser reports its own zone. */
const IST_MINUTES = 330;
const subscribe = () => () => {};

function zoneName(offset: number): string {
  if (offset === IST_MINUTES) return "India time";
  if (offset === 0) return "UTC";
  const minutes = Math.abs(offset) % 60;
  return `UTC${offset > 0 ? "+" : "-"}${Math.floor(Math.abs(offset) / 60)}${
    minutes ? `:${String(minutes).padStart(2, "0")}` : ""
  }`;
}

/**
 * Moves an hour-of-week grid (UTC, Monday 00:00 first) into another zone. A half-hour
 * offset splits each hour evenly between the two local hours it straddles.
 */
export function shiftGrid(hours: number[], offsetMinutes: number): number[] {
  const out = new Array<number>(168).fill(0);
  const whole = Math.floor(offsetMinutes / 60);
  const half = offsetMinutes % 60 !== 0;
  hours.forEach((value, slot) => {
    const a = (((slot + whole) % 168) + 168) % 168;
    if (!half) out[a] += value;
    else {
      out[a] += value / 2;
      out[(a + 1) % 168] += value / 2;
    }
  });
  return out;
}

/** The three-hour stretch of the day with the most replies, across the whole week. */
export function busiestHours(grid: number[]): { from: number; to: number } {
  const byHour = new Array<number>(24).fill(0);
  grid.forEach((value, slot) => (byHour[slot % 24] += value));
  let best = 0;
  let bestSum = -1;
  for (let h = 0; h < 24; h += 1) {
    const sum = byHour[h] + byHour[(h + 1) % 24] + byHour[(h + 2) % 24];
    if (sum > bestSum) {
      bestSum = sum;
      best = h;
    }
  }
  return { from: best, to: (best + 3) % 24 };
}

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** When the project replies, by weekday and hour, in the visitor's zone. Never per person. */
export function ReplyHours({
  hours,
  replies,
  people,
}: {
  hours: number[];
  replies: number;
  people: number;
}) {
  const offset = useSyncExternalStore(
    subscribe,
    () => -new Date().getTimezoneOffset(),
    () => IST_MINUTES,
  );
  const grid = useMemo(() => shiftGrid(hours, offset), [hours, offset]);
  const peak = useMemo(() => busiestHours(grid), [grid]);
  const max = Math.max(1, ...grid);
  const zone = zoneName(offset);

  return (
    <figure>
      <p className="mb-5 text-lg">
        Replies are most likely between{" "}
        <strong className="num font-medium">
          {hh(peak.from)} and {hh(peak.to)}
        </strong>{" "}
        <span className="text-ink-2">({zone}).</span>
      </p>
      <div
        role="img"
        aria-label={`Replies by weekday and hour in ${zone}. Busiest between ${hh(peak.from)} and ${hh(peak.to)}.`}
        className="grid grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-[2px] text-[10px]"
      >
        {DAYS.map((day, d) => (
          <div key={day} className="contents">
            <span className="text-ink-3 self-center">{day}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const value = grid[d * 24 + h];
              return (
                <span
                  key={h}
                  className="aspect-square rounded-[2px]"
                  style={{
                    background:
                      value === 0
                        ? "var(--bg-3)"
                        : `color-mix(in oklch, var(--accent) ${Math.round(18 + (value / max) * 82)}%, var(--bg-3))`,
                  }}
                />
              );
            })}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-ink-3 num text-center">
            {h % 6 === 0 ? String(h).padStart(2, "0") : ""}
          </span>
        ))}
      </div>
      <figcaption className="text-ink-3 mt-3 text-xs">
        {replies.toLocaleString("en-US")} replies from {people} maintainers over 90 days,
        counted together. Darker means more replies. Never shown per person.
      </figcaption>
      <TableView caption={`Replies by hour of day in ${zone}`}>
        <thead>
          <tr>
            <th scope="col">Hour ({zone})</th>
            <th scope="col" className="right">
              Replies, all weekdays
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 24 }, (_, h) => (
            <tr key={h}>
              <td className="num">{hh(h)}</td>
              <td className="right num">
                {Math.round(DAYS.reduce((sum, _, d) => sum + grid[d * 24 + h], 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </TableView>
    </figure>
  );
}
