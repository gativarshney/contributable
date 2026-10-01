export const DAY_MS = 86_400_000;

export function daysBetween(from: string | Date, to: string | Date): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / DAY_MS;
}

/** Whole days elapsed, never negative (GitHub's clock and ours can differ slightly). */
export function wholeDaysSince(date: string | Date, now: Date): number {
  return Math.max(0, Math.floor(daysBetween(date, now)));
}

export function windowStart(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

export function inWindow(date: string | null, now: Date, days: number): boolean {
  if (!date) return false;
  const t = new Date(date).getTime();
  return t > windowStart(now, days).getTime() && t <= now.getTime();
}

export function utcDay(date: string | Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** A window is covered when the collection is known to be complete back to its start. */
export function isCovered(coveredSince: string | null, now: Date, days: number): boolean {
  if (!coveredSince) return false;
  return new Date(coveredSince).getTime() <= windowStart(now, days).getTime();
}
