import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#f1efea";
const MUTED = "#a3a8ae";
const ACCENT = "#6fd3cf";

/** The share image used by every page: a title and up to three figures. */
export function ogCard({
  eyebrow,
  title,
  stats,
  footer,
}: {
  eyebrow: string;
  title: string;
  stats: { value: string; label: string }[];
  footer: string;
}) {
  const long = title.length > 28;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#0f1215",
        color: INK,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26 }}>
        <div style={{ display: "flex", letterSpacing: 6, color: ACCENT }}>
          CONTRIBUTABLE
        </div>
        <div style={{ display: "flex", color: MUTED }}>{eyebrow}</div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: long ? 60 : 84,
          lineHeight: 1.05,
          letterSpacing: -2,
        }}
      >
        {title.length > 60 ? `${title.slice(0, 58)}...` : title}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 72 }}>
          {stats.slice(0, 3).map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 72,
                  color: ACCENT,
                  letterSpacing: -2,
                }}
              >
                {stat.value}
              </div>
              <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 24, color: MUTED }}>
          {footer}
        </div>
      </div>
    </div>,
    OG_SIZE,
  );
}
