import type { Check, Checklist, CheckState } from "@/lib/insights/checklist";
import { Notes } from "./Block";
import { Ring } from "./charts";

const MARK: Record<CheckState, { symbol: string; label: string; className: string }> = {
  yes: { symbol: "✓", label: "Yes", className: "bg-accent text-accent-ink" },
  no: { symbol: "✕", label: "No", className: "bg-bg-3 text-ink" },
  unknown: {
    symbol: "?",
    label: "Not enough data",
    className: "border-hair-strong text-ink-3 border border-dashed",
  },
};

function summary(checklist: Checklist): string {
  const { favourable, checks, decided } = checklist;
  if (checks.some((c) => c.id === "archived"))
    return "This repository is archived. It no longer accepts changes.";
  const share = decided > 0 ? favourable / decided : 0;
  if (decided < checks.length / 2)
    return "There is not enough recent activity to say much.";
  if (share >= 0.85)
    return "Most signals point to a project that is open to new contributors.";
  if (share >= 0.6)
    return "A mixed picture. Look at what is missing before you commit time.";
  return "Several signals are missing. Expect a harder first contribution.";
}

function Item({ check }: { check: Check }) {
  const mark = MARK[check.state];
  return (
    <li className="flex items-start gap-3.5 py-3">
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] leading-none ${mark.className}`}
        role="img"
        aria-label={mark.label}
      >
        {mark.symbol}
      </span>
      <a href={`#${check.anchor}`} className="group min-w-0">
        <span
          className={`group-hover:text-accent block font-medium tracking-tight transition-colors ${
            check.state === "unknown" ? "text-ink-2" : ""
          }`}
        >
          {check.question}
        </span>
        <span className="text-ink-2 block text-[15px]">{check.answer}</span>
        {check.state === "unknown" ? (
          // An unanswered question must never read as a failed one.
          <span className="border-hair-strong text-ink-3 mt-1.5 inline-block rounded-full border border-dashed px-2 py-0.5 text-xs">
            Not enough data. This is not a no.
          </span>
        ) : null}
      </a>
    </li>
  );
}

/** The headline: how many of the questions worth asking come back favourable. */
export function Verdict({ checklist }: { checklist: Checklist }) {
  const { checks, favourable, decided } = checklist;
  const unknown = checks.length - decided;
  const half = Math.ceil(checks.length / 2);

  return (
    <section
      id="verdict"
      aria-labelledby="verdict-heading"
      className="border-hair border-t py-12 md:py-16"
    >
      <div className="card bg-bg-2 p-6 md:p-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:gap-12">
          <Ring
            value={favourable}
            total={checks.length}
            label={`${favourable} of ${checks.length} contributor signals are favourable`}
          />
          <div>
            <p className="eyebrow !text-accent">Should you contribute here?</p>
            <h2
              id="verdict-heading"
              className="display mt-3 max-w-xl text-[clamp(1.6rem,3.2vw,2.25rem)]"
            >
              {summary(checklist)}
            </h2>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="bg-accent size-2.5 rounded-full" />
                <strong className="font-medium">{favourable}</strong>
                <span className="text-ink-2">yes</span>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="bg-ink-3 size-2.5 rounded-full" />
                <strong className="font-medium">{decided - favourable}</strong>
                <span className="text-ink-2">no</span>
              </li>
              {unknown > 0 ? (
                <li className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="border-ink-3 size-2.5 rounded-full border border-dashed"
                  />
                  <strong className="font-medium">{unknown}</strong>
                  <span className="text-ink-2">not enough data</span>
                </li>
              ) : null}
            </ul>
            <p className="text-ink-3 mt-3 text-sm">
              Not a score. Each one is a yes or no you can check below.
            </p>
          </div>
        </div>

        <div className="border-hair mt-8 grid gap-x-12 border-t pt-4 md:grid-cols-2">
          <ul>
            {checks.slice(0, half).map((check) => (
              <Item key={check.id} check={check} />
            ))}
          </ul>
          <ul>
            {checks.slice(half).map((check) => (
              <Item key={check.id} check={check} />
            ))}
          </ul>
        </div>

        <Notes>
          {checks.map((check) => (
            <li key={check.id}>
              <span className="text-ink">{check.question}</span> Yes when: {check.rule}
            </li>
          ))}
          <li>
            The questions come from GitHub&rsquo;s Open Source Guide. Friendliness cannot
            be measured, so read a few recent threads yourself.
          </li>
        </Notes>
      </div>
    </section>
  );
}
