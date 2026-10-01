/** One section of the report: a question, a short answer, then the visual. */
export function Block({
  id,
  question,
  title,
  children,
}: {
  id: string;
  question: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-hair border-t py-14 md:py-20">
      <p className="eyebrow !text-accent">{question}</p>
      <h2 className="display mt-4 max-w-3xl text-[clamp(1.75rem,3.6vw,2.6rem)]">
        {title}
      </h2>
      <div className="mt-10">{children}</div>
    </section>
  );
}

/** A big figure with one line of context. */
export function Stat({
  value,
  unit,
  label,
}: {
  value: string | number | null;
  unit?: string;
  label: string;
}) {
  return (
    <div>
      <p className="text-5xl leading-none font-medium tracking-tight">
        {value === null ? <span className="text-ink-3">—</span> : value}
        {unit && value !== null ? (
          <span className="text-ink-3 ml-1.5 text-xl font-normal">{unit}</span>
        ) : null}
      </p>
      <p className="text-ink-2 mt-3 text-[15px]">{label}</p>
    </div>
  );
}

/** How the figures in a section were worked out, kept one click away. */
export function Notes({ children }: { children: React.ReactNode }) {
  return (
    <details className="group mt-8">
      <summary className="text-ink-3 hover:text-ink inline-flex cursor-pointer list-none items-center gap-2 text-sm transition-colors [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="border-hair-strong grid size-4 place-items-center rounded-full border text-[10px] transition-transform group-open:rotate-45"
        >
          +
        </span>
        How this is worked out
      </summary>
      <ul className="text-ink-2 border-hair mt-4 max-w-3xl space-y-2 border-l pl-5 text-sm">
        {children}
      </ul>
    </details>
  );
}
