/** Plain-language formatting shared by every page. Numbers first, no decoration. */

export const NOT_ENOUGH = "Not enough data";

/** "45 min", "18 h", "2.5 days", "3 weeks". */
export function duration(hours: number | null): string {
  if (hours === null) return NOT_ENOUGH;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  const days = hours / 24;
  if (days < 14)
    return `${days < 10 ? Math.round(days * 10) / 10 : Math.round(days)} days`;
  if (days < 90) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

/** Shown when most pull requests in a large enough sample never got a reply. */
export const UNANSWERED = "Mostly unanswered";

/**
 * Median first reply. With enough pull requests but no median, more than half were
 * never answered: that is a finding, not missing data, and it is said plainly.
 */
export function firstReply(hours: number | null, sample: number): string {
  if (hours !== null) return duration(hours);
  return sample >= 5 ? UNANSWERED : NOT_ENOUGH;
}

export function percent(share: number | null): string {
  return share === null ? NOT_ENOUGH : `${Math.round(share * 100)}%`;
}

/** "7 in 10", for verdict sentences. */
export function inTen(share: number): string {
  return `${Math.round(share * 10)} in 10`;
}

export function count(value: number): string {
  return value.toLocaleString("en-US");
}

export function compact(value: number): string {
  if (value < 1000) return String(value);
  if (value < 10_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  if (value < 1_000_000) return `${Math.round(value / 1000)}k`;
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "3 Oct 2026". Fixed format in UTC, so the server and the browser agree. */
export function date(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "3 Oct 2026, 14:05 UTC". */
export function dateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date(iso)}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export type Speed = "fast" | "ok" | "slow" | "unknown";

/** Reply speed band, used only to pick a status colour. The number is always shown. */
export function replySpeed(hours: number | null): Speed {
  if (hours === null) return "unknown";
  if (hours <= 48) return "fast";
  if (hours <= 168) return "ok";
  return "slow";
}

export const TREND_LABEL: Record<string, string> = {
  "got-faster": "Got faster",
  "slowed-down": "Slowed down",
  "went-quiet": "Went quiet",
  steady: "Steady",
  unknown: "",
};
