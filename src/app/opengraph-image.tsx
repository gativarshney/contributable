import { ImageResponse } from "next/og";

export const alt = "Contributable";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
        color: "#f1efea",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, color: "#6fd3cf" }}>
        CONTRIBUTABLE
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{ display: "flex", fontSize: 76, lineHeight: 1.05, letterSpacing: -2 }}
        >
          Know a repository
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            lineHeight: 1.05,
            letterSpacing: -2,
            color: "#6fd3cf",
          }}
        >
          before your first pull request.
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 28, color: "#a3a8ae" }}>
        For open source contributors · evidence from public GitHub data
      </div>
    </div>,
    size,
  );
}
