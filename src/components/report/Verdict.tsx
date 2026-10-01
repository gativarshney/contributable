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
        <span className="group-hover:text-accent block font-medium tracking-tight transition-colors">
          {check.question}
        </span>
        <span className="text-ink-2 block text-[15px]">{check.answer}</span>
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
            <p className="text-ink-2 mt-4 text-[15px]">
              {favourable} of {checks.length} signals are favourable
              {unknown > 0 ? `, ${unknown} could not be decided` : ""}. Not a score: each
              one is a yes or no you can check below.
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
