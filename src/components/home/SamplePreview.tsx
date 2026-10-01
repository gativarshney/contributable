import Link from "next/link";
import { buildSampleReport } from "@/lib/sample/dataset";

export function SamplePreview() {
  const { repository, analysis, findings } = buildSampleReport();
  const activity = analysis.activity.windows[30];
  const concentration = analysis.contributors.windows[90];
  const figures: [string, string, string][] = [
    ["Commits", String(activity.commits), "Last 30 days"],
    ["Top contributor share", `${concentration.topShare}%`, "Of commits, last 90 days"],
    [
      "Median release interval",
      `${analysis.releases.medianIntervalDays} d`,
      "Between releases",
    ],
    ["Pull requests merged", String(analysis.pulls.windows[30].resolved), "Last 30 days"],
  ];

  return (
    <section
      aria-labelledby="sample-heading"
      className="border-hair border-t py-20 md:py-28"
    >
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Example analysis</p>
            <h2
              id="sample-heading"
              className="display mt-5 text-[clamp(2.4rem,5.5vw,4rem)]"
            >
              What a report <em>looks like.</em>
            </h2>
          </div>
          <Link href="/sample" className="btn btn-ghost">
            Open the full example →
          </Link>
        </div>

        <div className="border-hair-strong bg-bg-2 mt-12 overflow-hidden rounded-xl border">
          <div className="border-hair flex items-center gap-3 border-b px-5 py-3">
            <span className="chip !border-accent !text-accent">Example analysis</span>
            <span className="text-ink-3 truncate font-mono text-xs">
              Illustrative data — this repository does not exist
            </span>
          </div>
          <div className="p-6 md:p-10">
            <p className="display text-[clamp(1.8rem,4vw,3rem)] break-words">
              {repository.owner}/<em>{repository.name}</em>
            </p>
            <p className="text-ink-2 mt-3">{repository.description}</p>
            <dl className="border-hair mt-8 grid grid-cols-2 border-t lg:grid-cols-4">
              {figures.map(([label, value, context]) => (
                <div key={label} className="border-hair border-b py-5 pr-4">
                  <dt className="eyebrow">{label}</dt>
                  <dd className="font-display mt-3 text-4xl leading-none">{value}</dd>
                  <dd className="text-ink-2 mt-2 text-sm">{context}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-8 grid gap-6 md:grid-cols-3">
              {findings.slice(0, 3).map((finding) => (
                <li key={finding.id}>
                  <p className="eyebrow !text-accent">{finding.category}</p>
                  <p className="font-display mt-2 text-2xl leading-tight">
                    {finding.title}
                  </p>
                  <p className="text-ink-2 mt-2 text-sm">{finding.statement}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
