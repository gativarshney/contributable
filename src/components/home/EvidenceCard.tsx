import { buildSampleReport } from "@/lib/sample/dataset";

/** A metric with its evidence expanded, using figures from the example report. */
export function EvidenceCard() {
  const data = buildSampleReport().analysis.contributors.windows[90];
  const top = data.distribution[0];
  const rows: [string, string | number][] = [
    ["Most active author", top.name],
    ["Their commits", top.commits],
    ["Human-authored commits", data.humanCommits],
    ["Bot commits excluded", data.botCommits],
  ];

  return (
    <figure
      className="card bg-bg-2 p-7 md:p-9"
      style={{ boxShadow: "var(--shadow)" }}
      aria-label="Example of a metric with its evidence"
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow">Top contributor share</p>
        <span className="chip !border-accent !text-accent">Example</span>
      </div>
      <p className="font-display mt-5 text-6xl leading-none">
        {data.topShare}
        <span className="text-ink-3 ml-1 text-3xl">%</span>
      </p>
      <p className="text-ink-2 mt-2 text-sm">
        Of {data.humanCommits} commits, last 90 days
      </p>

      <div className="border-hair mt-7 space-y-5 border-t pt-6 text-sm">
        <div>
          <p className="eyebrow !text-accent !text-[10px]">Observed</p>
          <dl className="mt-2 space-y-1.5">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-ink-2">{label}</dt>
                <dd className="font-mono text-xs leading-5">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <p className="eyebrow !text-accent !text-[10px]">Calculation</p>
          <p className="mt-2 font-mono text-xs">
            {top.commits} ÷ {data.humanCommits} × 100
          </p>
        </div>
        <div>
          <p className="eyebrow !text-accent !text-[10px]">Limitation</p>
          <p className="text-ink-2 mt-2">
            A concentration signal, not proof of project risk.
          </p>
        </div>
      </div>
    </figure>
  );
}
