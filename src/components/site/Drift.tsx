import type { ReactNode } from "react";

/**
 * A slow, endless row of items that drifts sideways and fades at both edges, as under
 * the Google Summer of Code heading. Decorative: the page below lists the same things.
 */
export function Drift({
  items,
  reverse = false,
  seconds = 70,
}: {
  items: ReactNode[];
  reverse?: boolean;
  seconds?: number;
}) {
  if (items.length < 6) return null;
  return (
    <div className="logo-wall" aria-hidden="true">
      <div
        className="logo-wall-track"
        style={{
          animationDuration: `${seconds}s`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {[...items, ...items].map((item, i) => (
          <div key={i} className="shrink-0">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A pill with a dot, for drifting repository names, languages and issue titles. */
export function DriftPill({
  children,
  accent = false,
}: {
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap ${
        accent ? "border-accent/50 text-ink" : "border-hair-strong text-ink-2"
      }`}
    >
      <span className={`size-1.5 rounded-full ${accent ? "bg-accent" : "bg-ink-3"}`} />
      {children}
    </span>
  );
}

/** The round icon badge at the top of a page heading. */
export function PageMark({ icon }: { icon: string }) {
  return (
    <span className="border-accent/50 bg-accent-soft/40 text-accent grid size-11 shrink-0 place-items-center rounded-full border shadow-[0_0_0_4px_var(--glow)]">
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={icon} />
      </svg>
    </span>
  );
}
