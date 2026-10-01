export const fmt = (n: number) => n.toLocaleString("en-US");

export const compact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export const ago = (days: number | null) =>
  days === null
    ? "never"
    : days === 0
      ? "today"
      : days === 1
        ? "yesterday"
        : days < 60
          ? `${days} days ago`
          : days < 730
            ? `${Math.round(days / 30)} months ago`
            : `${Math.round(days / 365)} years ago`;

export const plural = (n: number, word: string) =>
  `${fmt(n)} ${word}${n === 1 ? "" : "s"}`;

/** A wait in hours, in the unit a person would say it in. */
export function wait(hours: number): { value: string; unit: string } {
  if (hours < 1)
    return { value: String(Math.max(1, Math.round(hours * 60))), unit: "min" };
  if (hours < 48)
    return { value: String(Math.round(hours)), unit: hours < 1.5 ? "hour" : "hours" };
  return { value: String(Math.round(hours / 24)), unit: "days" };
}
