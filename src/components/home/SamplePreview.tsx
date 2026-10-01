import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { buildSampleReport } from "@/lib/sample/dataset";

export function SamplePreview() {
  const { repository, analysis, findings } = buildSampleReport();
  const daily = analysis.activity.daily.slice(-60);
  const peak = Math.max(1, ...daily.map((d) => d.count));
  const figures: [string, string, string][] = [
    ["Commits", String(analysis.activity.windows[30].commits), "30 days"],
    [
      "Top contributor",
      `${analysis.contributors.windows[90].topShare}%`,
      "of commits, 90 days",
    ],
    [
      "Community PRs merged",
      `${analysis.contributing.windows[90].mergeShare}%`,
      "90 days",
    ],
    ["PRs merged", String(analysis.pulls.windows[30].resolved), "30 days"],
  ];

  return (
    <section aria-labelledby="sample-heading" className="pt-16 pb-10 md:pt-24 md:pb-16">
      <Reveal className="shell">
        <div
          className="border-hair-strong bg-bg-2 overflow-hidden rounded-2xl border"
          style={{ boxShadow: "var(--shadow)" }}
        >
          <div className="border-hair flex items-center justify-between gap-4 border-b px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="flex gap-1.5" aria-hidden="true">
                <i className="bg-bg-3 size-2.5 rounded-full" />
                <i className="bg-bg-3 size-2.5 rounded-full" />
                <i className="bg-bg-3 size-2.5 rounded-full" />
              </span>
              <h2 id="sample-heading" className="eyebrow">
                Example analysis
              </h2>
            </div>
            <Link
              href="/sample"
              className="text-ink-2 hover:text-ink text-sm transition-colors"
            >
              Open full report →
            </Link>
          </div>

          <div className="p-6 md:p-10">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <div>
                <p className="display text-[clamp(1.6rem,3.6vw,2.5rem)] break-words">
                  {repository.owner}/<em>{repository.name}</em>
                </p>
                <p className="text-ink-3 mt-2 text-sm">
                  Illustrative data. This repository does not exist.
                </p>
              </div>
              <div
                className="flex h-14 w-full max-w-sm items-end gap-[3px]"
                role="img"
                aria-label="Commits per day over 60 days in the example repository"
              >
                {daily.map((d) => (
                  <span
                    key={d.date}
                    className="bg-accent min-h-px flex-1 rounded-t-[2px]"
                    style={{
                      height: `${(d.count / peak) * 100}%`,
                      opacity: d.count === 0 ? 0.25 : 1,
                    }}
                  />
                ))}
              </div>
            </div>

            <dl className="bg-hair border-hair mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border lg:grid-cols-4">
              {figures.map(([label, value, context]) => (
                <div key={label} className="bg-bg-2 p-5">
                  <dt className="eyebrow">{label}</dt>
                  <dd className="font-display mt-3 text-4xl leading-none">{value}</dd>
                  <dd className="text-ink-3 mt-2 text-sm">{context}</dd>
                </div>
              ))}
            </dl>

            <ul className="mt-8 grid gap-x-10 gap-y-6 md:grid-cols-3">
              {findings.slice(0, 3).map((finding) => (
                <li key={finding.id} className="border-accent border-l pl-4">
                  <p className="font-medium tracking-tight">{finding.title}</p>
                  <p className="text-ink-2 mt-1 text-sm">{finding.statement}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
