import { SLOTS_PER_WEEK } from "./contributing";

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Shifts half-hour UTC slots into a time zone and folds them into whole hours.
 * The result is indexed as hour * 7 + weekday: 24 columns of seven.
 */
export function toLocalGrid(slots: number[], offsetMinutes: number): number[] {
  const shift = Math.round(offsetMinutes / 30);
  const grid = new Array<number>(24 * 7).fill(0);
  slots.forEach((count, slot) => {
    if (count === 0) return;
    const local = (((slot + shift) % SLOTS_PER_WEEK) + SLOTS_PER_WEEK) % SLOTS_PER_WEEK;
    const weekday = Math.floor(local / 48);
    const hour = Math.floor((local % 48) / 2);
    grid[hour * 7 + weekday] += count;
  });
  return grid;
}

/** The weekday with the most activity and the busiest three-hour stretch of the day. */
export function busiest(grid: number[]): { day: string; from: number; to: number } {
  const byDay = WEEKDAYS.map((_, d) =>
    Array.from({ length: 24 }, (_, h) => grid[h * 7 + d]).reduce((a, b) => a + b, 0),
  );
  const byHour = Array.from({ length: 24 }, (_, h) =>
    grid.slice(h * 7, h * 7 + 7).reduce((a, b) => a + b, 0),
  );
  let from = 0;
  let best = -1;
  for (let h = 0; h < 24; h++) {
    const sum = byHour[h] + byHour[(h + 1) % 24] + byHour[(h + 2) % 24];
    if (sum > best) {
      best = sum;
      from = h;
    }
  }
  return {
    day: WEEKDAYS[byDay.indexOf(Math.max(...byDay))],
    from,
    to: (from + 3) % 24,
  };
}
