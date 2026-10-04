import { NEXT_GSOC } from "@/lib/gsoc-timeline";

/** The next programme as a line of steps, with a marker for where today falls on it. */
export function GsocTimeline({ now = new Date() }: { now?: Date }) {
  const { year, official, source, steps } = NEXT_GSOC;
  const today = now.toISOString().slice(0, 10);
  // Index of the next step still ahead; steps.length once the programme is over.
  const next = steps.findIndex((step) => step.date >= today);
  const upcoming = next === -1 ? steps.length : next;
  if (upcoming === steps.length) return null;
  const days = Math.ceil(
    (Date.parse(steps[upcoming].date) - Date.parse(today)) / 86_400_000,
  );

  return (
    <section aria-labelledby="next-gsoc" className="card mt-10 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="next-gsoc" className="font-display text-xl">
              Google Summer of Code {year}
            </h2>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                official ? "border-accent/50 text-accent" : "border-slow/50 text-slow"
              }`}
            >
              {official ? "Official dates" : "Expected dates"}
            </span>
          </div>
          <p className="text-ink-2 mt-2 max-w-2xl text-sm">
            {upcoming === 0
              ? "Now is the best time to start: contribute small fixes to the organisation you want, so the mentors know your name before applications open."
              : `Next: ${steps[upcoming].title.toLowerCase()}.`}
          </p>
        </div>
        {/* Expected dates are only good to the week, so they are counted in weeks. */}
        <p className="md:text-right">
          <span className="num block text-3xl leading-none font-medium tracking-tight">
            {official || days < 14 ? days : `~${Math.round(days / 7)}`}
          </span>
          <span className="text-ink-3 text-xs">
            {official || days < 14 ? "days" : "weeks"} to{" "}
            {steps[upcoming].title.toLowerCase()}
          </span>
        </p>
      </div>

      <ol className="relative mt-8 grid gap-6 md:grid-cols-7 md:gap-3">
        <span
          className="bg-hair absolute top-[7px] right-[7%] left-[7%] hidden h-px md:block"
          aria-hidden="true"
        />
        <span
          className="bg-hair absolute top-2 bottom-2 left-[7px] w-px md:hidden"
          aria-hidden="true"
        />
        {steps.map((step, i) => {
          const done = i < upcoming;
          const current = i === upcoming;
          return (
            <li
              key={step.title}
              className="relative flex gap-4 md:flex-col md:items-center md:gap-3 md:text-center"
            >
              <span
                className={`relative z-10 mt-0.5 size-[15px] shrink-0 rounded-full border-2 md:mt-0 ${
                  done
                    ? "border-accent bg-accent"
                    : current
                      ? "border-accent bg-bg ring-accent/25 ring-4"
                      : "border-hair-strong bg-bg"
                }`}
                aria-hidden="true"
              />
              <div className={done ? "opacity-55" : ""}>
                <p className="text-ink-3 num text-xs">{step.when}</p>
                <h3
                  className={`mt-1 text-sm font-medium ${current ? "text-accent" : ""}`}
                >
                  {step.title}
                </h3>
                <p className="text-ink-2 mt-1 text-xs leading-relaxed">{step.tip}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-ink-3 mt-8 text-xs">
        {official
          ? "Dates from Google."
          : `Google has not published the ${year} dates yet; these follow the 2026 programme, which has kept the same shape for years.`}{" "}
        <a href={source} className="link" target="_blank" rel="noreferrer">
          Official timeline
        </a>
      </p>
    </section>
  );
}
