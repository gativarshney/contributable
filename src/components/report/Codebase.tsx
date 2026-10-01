import type { Report } from "@/lib/report/run";

// Opacity steps of the accent colour; the last entry is the neutral "Other" bucket.
const SHADES = ["opacity-100", "opacity-75", "opacity-55", "opacity-40", "opacity-25"];

export function Codebase({ report }: { report: Report }) {
  const { stack, contributing } = report.analysis;
  const { labels } = contributing;
  if (stack.length === 0 && labels.length === 0) return null;
  const busiest = Math.max(1, ...labels.map((l) => l.count));

  return (
    <section id="codebase" className="border-hair border-t py-14 md:py-20">
      <p className="eyebrow !text-accent">The work</p>
      <h2 className="display mt-4 text-[clamp(2rem,4.5vw,3.25rem)]">
        Is it <em>your kind of project?</em>
      </h2>
      <p className="text-ink-2 mt-3 max-w-2xl">
        What the code is written in, and what recent issues and pull requests are about.
      </p>

      <div className="mt-10 grid gap-x-16 gap-y-12 lg:grid-cols-2">
        {stack.length > 0 ? (
          <div>
            <h3 className="eyebrow border-hair border-b pb-3">Languages</h3>
            <div
              className="mt-6 flex h-3 gap-0.5 overflow-hidden rounded-full"
              role="img"
              aria-label={`Languages by share of code: ${stack.map((l) => `${l.name} ${l.share}%`).join(", ")}`}
            >
              {stack.map((language, i) => (
                <span
                  key={language.name}
                  title={`${language.name} ${language.share}%`}
                  style={{ width: `${language.share}%` }}
                  className={
                    language.name === "Other"
                      ? "bg-bg-3"
                      : `bg-accent ${SHADES[Math.min(i, SHADES.length - 1)]}`
                  }
                />
              ))}
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {stack.map((language, i) => (
                <li
                  key={language.name}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={`size-2 rounded-full ${
                        language.name === "Other"
                          ? "bg-bg-3"
                          : `bg-accent ${SHADES[Math.min(i, SHADES.length - 1)]}`
                      }`}
                    />
                    {language.name}
                  </span>
                  <span className="text-ink-2 font-mono text-xs">{language.share}%</span>
                </li>
              ))}
            </ul>
            <p className="text-ink-3 mt-4 text-xs">
              Share of code by bytes, as GitHub detects it. Vendored and generated files
              can skew this.
            </p>
          </div>
        ) : null}

        {labels.length > 0 ? (
          <div>
            <h3 className="eyebrow border-hair border-b pb-3">
              What people are working on
            </h3>
            <ul className="mt-5 space-y-2.5">
              {labels.slice(0, 8).map((label) => (
                <li
                  key={label.name}
                  className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-4 text-sm"
                >
                  <span className="truncate">{label.name}</span>
                  <span className="bg-bg-2 h-1.5 overflow-hidden rounded-full">
                    <span
                      className="bg-accent block h-full rounded-full"
                      style={{ width: `${(label.count / busiest) * 100}%` }}
                    />
                  </span>
                  <span className="text-ink-2 w-8 text-right font-mono text-xs">
                    {label.count}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-ink-3 mt-4 text-xs">
              Labels on issues and pull requests opened in the last 90 days. Depends
              entirely on how the project labels its work.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
