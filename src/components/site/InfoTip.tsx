/** One-line definitions shown behind the info icons. */
export const FIRST_REPLY_INFO =
  "Median time until a person from the project comments on, or merges, a pull request from an outside contributor. Bots do not count. Pull requests opened 30 to 120 days ago.";

/**
 * A small info icon that shows a definition on hover, or on tap and keyboard focus.
 * Plain CSS, so it works without JavaScript and inside server components.
 */
export function InfoTip({
  text,
  align = "left",
  side = "top",
}: {
  text: string;
  /** Which edge of the icon the bubble lines up with, so it stays on screen. On phones it sits above the tab bar instead. */
  align?: "left" | "right";
  /** Below is for places that clip upwards, such as a table header. */
  side?: "top" | "bottom";
}) {
  return (
    <span className="group/tip relative z-10 inline-flex align-middle">
      <button
        type="button"
        aria-label={`What this means: ${text}`}
        className="text-ink-3 hover:text-accent focus-visible:text-accent grid size-4 place-items-center rounded-full transition-colors"
      >
        <svg
          viewBox="0 0 16 16"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6.3" />
          <path d="M8 7.2v3.6" strokeLinecap="round" />
          <circle cx="8" cy="5" r=".4" fill="currentColor" />
        </svg>
      </button>
      <span
        role="tooltip"
        className={`border-hair-strong bg-bg-2 text-ink-2 pointer-events-none invisible absolute z-50 w-64 rounded-xl border p-3 text-left text-xs leading-relaxed font-normal tracking-normal whitespace-normal normal-case opacity-0 shadow-lg transition-opacity duration-150 group-focus-within/tip:visible group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:opacity-100 ${
          side === "top" ? "bottom-full mb-2" : "top-full mt-2"
        } ${align === "left" ? "-left-2" : "-right-2"} max-sm:fixed max-sm:inset-x-4 max-sm:top-auto max-sm:bottom-20 max-sm:mb-0 max-sm:w-auto max-sm:text-sm`}
      >
        {text}
      </span>
    </span>
  );
}
