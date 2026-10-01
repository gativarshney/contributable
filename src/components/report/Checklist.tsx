import type {
  Check,
  Checklist as ChecklistData,
  CheckState,
} from "@/lib/insights/checklist";

const MARK: Record<CheckState, { symbol: string; label: string; className: string }> = {
  yes: { symbol: "✓", label: "Favourable", className: "bg-accent text-accent-ink" },
  no: { symbol: "✕", label: "Not favourable", className: "bg-bg-3 text-ink" },
  unknown: {
    symbol: "?",
    label: "Not enough data",
    className: "border-hair-strong text-ink-3 border border-dashed",
  },
};

const GROUPS: Check["group"][] = [
  "Open source",
  "Actively maintained",
  "Open to contributions",
];

function Row({ check }: { check: Check }) {
  const mark = MARK[check.state];
  return (
    <li className="border-hair border-b py-4 last:border-b-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-4 [&::-webkit-details-marker]:hidden">
          <span
            className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] leading-none ${mark.className}`}
            aria-label={mark.label}
            role="img"
          >
            {mark.symbol}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium tracking-tight">{check.question}</span>
            <span className="text-ink-2 mt-0.5 block text-[15px]">{check.answer}</span>
          </span>
          <span
            aria-hidden="true"
            className="text-ink-3 mt-1 transition-transform group-open:rotate-90"
          >
            ›
          </span>
        </summary>
        <p className="text-ink-3 mt-3 pl-9 text-sm">
          Counts as favourable when: {check.rule}{" "}
          <a href={`#${check.anchor}`} className="link text-ink-2 whitespace-nowrap">
            See the evidence
          </a>
        </p>
      </details>
    </li>
  );
}

/** The contributor checklist: observable answers to the questions worth asking first. */
export function Checklist({ checklist }: { checklist: ChecklistData }) {
  const { checks, favourable, decided } = checklist;
  const unknown = checks.length - decided;

  return (
    <section
      id="checklist"
      aria-labelledby="checklist-heading"
      className="border-hair border-t py-12 md:py-16"
    >
      <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-16">
        <div className="lg:sticky lg:top-36 lg:self-start">
          <p className="eyebrow !text-accent">Contributor checklist</p>
          <h2
            id="checklist-heading"
            className="display mt-4 text-[clamp(2rem,4vw,2.75rem)]"
          >
            Should you <em>contribute here?</em>
          </h2>
          <p className="font-display mt-8 text-7xl leading-none">
            {favourable}
            <span className="text-ink-3 text-4xl"> / {checks.length}</span>
          </p>
          <p className="text-ink-2 mt-3 text-[15px]">
            signals look favourable
            {unknown > 0 ? `, ${unknown} could not be decided from the data` : ""}.
          </p>
          <div
            className="mt-6 flex gap-1"
            role="img"
            aria-label={`${favourable} of ${checks.length} signals favourable`}
          >
            {checks.map((check) => (
              <span
                key={check.id}
                title={`${check.question} ${MARK[check.state].label}`}
                className={`h-1.5 flex-1 rounded-full ${
                  check.state === "yes"
                    ? "bg-accent"
                    : check.state === "no"
                      ? "bg-ink-3"
                      : "bg-bg-3"
                }`}
              />
            ))}
          </div>
          <p className="text-ink-3 mt-6 text-sm">
            This is a count of observable signals, not a score. The questions follow
            GitHub&rsquo;s Open Source Guide. Whether people are friendly cannot be
            measured: read a few recent threads before you decide.
          </p>
        </div>

        <div className="gap-x-12 md:columns-2 lg:columns-1 xl:columns-2">
          {GROUPS.map((group) => {
            const rows = checks.filter((check) => check.group === group);
            if (rows.length === 0) return null;
            return (
              <div key={group} className="mb-8 break-inside-avoid">
                <h3 className="eyebrow border-hair border-b pb-3">{group}</h3>
                <ul>
                  {rows.map((check) => (
                    <Row key={check.id} check={check} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
