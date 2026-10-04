import { NEXT_GSOC } from "@/lib/gsoc-timeline";

/** Each phase has its own shade of the accent, so the three stages read at a glance. */
const PHASE_TONE: Record<string, string> = {
  orgs: "bg-accent/35",
  apply: "bg-accent/65",
  code: "bg-accent",
};

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/** The next programme as a line of steps, with a marker for where today falls on it. */
export function GsocTimeline({ now = new Date() }: { now?: Date }) {
  const { year, official, source, phases, steps } = NEXT_GSOC;
  const today = now.toISOString().slice(0, 10);
  const upcoming = steps.findIndex((step) => step.date >= today);
  if (upcoming === -1) return null;
  const next = steps[upcoming];
  const days = Math.ceil((Date.parse(next.date) - Date.parse(today)) / 86_400_000);
  // Expected dates are only good to the week, so they are counted in weeks.
  const inDays = official || days < 14;
  const span = (id: string) => steps.filter((s) => s.phase === id).length;
  const month = now.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });

  return (
    <section
      id="next-gsoc-timeline"
      aria-labelledby="next-gsoc"
      className="card hero-glow-card relative mt-10 overflow-hidden p-6 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="next-gsoc" className="font-display text-2xl">
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
          <p className="text-ink-2 mt-2 text-sm">
            {upcoming === 0
              ? "Now is the best time to start: contribute small fixes to the organisation you want, so the mentors know your name before applications open."
              : `Next up: ${next.title.toLowerCase()}. ${next.tip}`}
          </p>
        </div>
        <div className="border-accent/30 bg-accent-soft/40 flex items-center gap-3 rounded-2xl border px-4 py-3">
          <span className="num text-accent text-4xl leading-none font-medium tracking-tight">
            {inDays ? days : `~${Math.round(days / 7)}`}
          </span>
          <span className="text-ink-2 text-xs leading-tight">
            {inDays ? "days" : "weeks"} until
            <br />
            <span className="text-ink font-medium">{next.title.toLowerCase()}</span>
          </span>
        </div>
      </div>

      {/* Wide screens: phases on top, then one row of steps on a shared line. */}
      <div className="mt-10 hidden lg:block">
        <div className="grid grid-cols-8 gap-3">
          <span />
          {phases.map((phase) => (
            <div key={phase.id} style={{ gridColumn: `span ${span(phase.id)}` }}>
              <p className="text-ink-3 eyebrow !text-[10px]">{phase.label}</p>
              <span
                className={`mt-2 block h-1 rounded-full ${PHASE_TONE[phase.id]}`}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </div>

      <ol className="relative mt-8 grid gap-10 lg:mt-5 lg:grid-cols-8 lg:gap-3">
        {/* The line the steps sit on, dashed for the stretch before the first one. */}
        <span
          className="border-accent/40 absolute top-[26px] left-[6.25%] hidden w-[12.5%] border-t border-dashed lg:block"
          aria-hidden="true"
        />
        <span
          className="bg-accent/30 absolute top-[26px] right-[6.25%] left-[18.75%] hidden h-px lg:block"
          aria-hidden="true"
        />
        <span
          className="bg-accent/25 absolute top-4 bottom-4 left-[17px] w-px lg:hidden"
          aria-hidden="true"
        />

        <li className="relative flex gap-4 lg:flex-col lg:items-center lg:gap-3 lg:p-2 lg:text-center">
          <span className="relative z-10 grid size-9 shrink-0 place-items-center">
            <span className="bg-accent/30 absolute inset-1 animate-ping rounded-full motion-reduce:hidden" />
            <span className="bg-accent ring-bg-2 relative size-3.5 rounded-full ring-4" />
          </span>
          <div className="pt-1.5 lg:pt-0">
            <p className="text-accent num text-xs">{month}</p>
            <h3 className="mt-0.5 text-sm font-medium">Today</h3>
            <p className="text-ink-3 mt-1 text-xs leading-relaxed">You are here.</p>
          </div>
        </li>

        {steps.map((step, i) => {
          const done = i < upcoming;
          const current = i === upcoming;
          const phaseStart = i === 0 || steps[i - 1].phase !== step.phase;
          return (
            <li
              key={step.title}
              className={`relative flex gap-4 rounded-xl lg:flex-col lg:items-center lg:gap-3 lg:p-2 lg:text-center ${
                current ? "lg:bg-accent-soft/30" : ""
              }`}
            >
              {phaseStart ? (
                <p className="text-ink-3 eyebrow absolute -top-5 left-13 !text-[10px] lg:hidden">
                  {phases.find((p) => p.id === step.phase)?.label}
                </p>
              ) : null}
              <span
                className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full border transition-colors ${
                  done
                    ? "border-accent bg-accent text-accent-ink"
                    : current
                      ? "border-accent bg-bg-2 text-accent ring-accent/20 ring-4"
                      : "border-hair-strong bg-bg-2 text-ink-2"
                }`}
              >
                <Icon d={done ? "M5 12.5 10 17 19 7.5" : step.icon} />
              </span>
              <div className={`pt-1 lg:pt-0 ${done ? "opacity-55" : ""}`}>
                <p className="text-ink-3 num text-xs">{step.when}</p>
                <h3
                  className={`mt-0.5 text-sm leading-snug font-medium ${current ? "text-accent" : ""}`}
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
