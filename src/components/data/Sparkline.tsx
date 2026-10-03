/** A small trend line. Decorative next to a number; the label carries the meaning. */
export function Sparkline({
  values,
  label,
  width = 88,
  height = 24,
}: {
  values: number[];
  label: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2 || values.every((v) => v === 0)) {
    return <span className="text-ink-3 text-xs">No recent pull requests</span>;
  }
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const y = (v: number) => height - 2 - (v / max) * (height - 4);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`);
  const last = values[values.length - 1];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--ink-3)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={width} cy={y(last)} r="2.5" fill="var(--accent)" />
    </svg>
  );
}
