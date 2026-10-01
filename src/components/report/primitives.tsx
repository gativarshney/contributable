export const fmt = (n: number) => n.toLocaleString("en-US");
export const compact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
export const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
export const ago = (days: number | null) =>
  days === null
    ? "—"
    : days === 0
      ? "today"
      : days === 1
        ? "1 day ago"
        : `${fmt(days)} days ago`;

interface MetricProps {
  label: string;
  value: string | number | null;
  unit?: string;
  context: string;
  meaning: string;
  caveat: string;
  formula?: string;
  evidence: [string, string | number][];
  /** Shown instead of the context line when there is no value to report. */
  missing?: string;
}

export function Metric({
  label,
  value,
  unit,
  context,
  meaning,
  caveat,
  formula,
  evidence,
  missing = "Not reported: the data does not cover this window.",
}: MetricProps) {
  return (
    <div className="bg-bg flex flex-col p-6">
      <p className="eyebrow">{label}</p>
      <p className="font-display mt-4 text-5xl leading-none">
        {value === null ? <span className="text-ink-3">—</span> : value}
        {unit && value !== null ? (
          <span className="text-ink-2 ml-1 text-2xl">{unit}</span>
        ) : null}
      </p>
      <p className="text-ink-2 mt-2 text-sm">{value === null ? missing : context}</p>
      <details className="group mt-auto pt-5">
        <summary className="eyebrow hover:text-ink flex cursor-pointer list-none items-center gap-2 transition-colors [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="transition-transform group-open:rotate-90">
            ›
          </span>
          View evidence
        </summary>
        <div className="border-hair mt-4 space-y-4 border-t pt-4 text-sm">
          <div>
            <p className="eyebrow !text-accent !text-[10px]">Observed</p>
            <dl className="mt-1.5 space-y-1">
              {evidence.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="text-right font-mono text-xs">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          {formula ? (
            <div>
              <p className="eyebrow !text-accent !text-[10px]">Calculation</p>
              <p className="mt-1.5 font-mono text-xs">{formula}</p>
            </div>
          ) : null}
          <div>
            <p className="eyebrow !text-accent !text-[10px]">Why this matters</p>
            <p className="text-ink-2 mt-1.5">{meaning}</p>
          </div>
          <div>
            <p className="eyebrow !text-accent !text-[10px]">Limitation</p>
            <p className="text-ink-2 mt-1.5">{caveat}</p>
          </div>
        </div>
      </details>
    </div>
  );
}

export function Bars({
  data,
  title,
  legend,
}: {
  data: { label: string; a: number; b?: number }[];
  title: string;
  legend: [string, string?];
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b ?? 0]));
  const total = data.reduce((s, d) => s + d.a, 0);
  return (
    <figure className="border-hair mt-px border p-6">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="eyebrow">{title}</span>
        <span className="text-ink-2 flex gap-4 font-mono text-xs">
          <span className="flex items-center gap-1.5">
            <span className="bg-accent size-2 rounded-[1px]" aria-hidden="true" />
            {legend[0]}
          </span>
          {legend[1] ? (
            <span className="flex items-center gap-1.5">
              <span className="bg-series-2 size-2 rounded-[1px]" aria-hidden="true" />
              {legend[1]}
            </span>
          ) : null}
        </span>
      </figcaption>
      <div
        role="img"
        aria-label={`${title}. ${legend[0]}: ${fmt(total)} in total, peak ${fmt(max)}.`}
        className="border-hair mt-6 flex h-40 items-end gap-[3px] border-b"
      >
        {data.map((d) => (
          <div
            key={d.label}
            title={`${d.label}: ${d.a} ${legend[0].toLowerCase()}${
              d.b !== undefined ? `, ${d.b} ${legend[1]?.toLowerCase()}` : ""
            }`}
            className="hover:bg-bg-2 flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]"
          >
            <span
              className="bg-accent block w-full max-w-5 rounded-t-[2px]"
              style={{ height: `${(d.a / max) * 100}%`, minHeight: d.a > 0 ? 2 : 0 }}
            />
            {d.b !== undefined ? (
              <span
                className="bg-series-2 block w-full max-w-5 rounded-t-[2px]"
                style={{ height: `${(d.b / max) * 100}%`, minHeight: d.b > 0 ? 2 : 0 }}
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="text-ink-3 mt-2 flex justify-between font-mono text-[11px]">
        <span>{data[0]?.label}</span>
        <span>peak {fmt(max)}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </figure>
  );
}

export function Section({
  id,
  index,
  title,
  lede,
  children,
}: {
  id: string;
  index: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-hair border-t py-14 md:py-20">
      <p className="eyebrow">{index}</p>
      <h2 className="display mt-4 text-[clamp(2rem,4.5vw,3.25rem)]">{title}</h2>
      <p className="text-ink-2 mt-3 max-w-2xl">{lede}</p>
      <div className="mt-10">{children}</div>
    </section>
  );
}

export const grid =
  "bg-hair border-hair grid gap-px border sm:grid-cols-2 lg:grid-cols-4";
export const Unavailable = ({ children }: { children: React.ReactNode }) => (
  <p className="border-hair text-ink-2 border border-dashed p-6 text-sm">{children}</p>
);
