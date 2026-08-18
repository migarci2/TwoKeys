import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TwoKeys: no agreement, no action";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#ffffff",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="40" height="40" viewBox="0 0 64 64">
          <path fill="#061C4A" d="M10 6h26v10H20v12h16v8H10l-4-4V10l4-4Z" />
          <path fill="#0B4BFF" d="M54 58H28V48h16V36H28v-8h26l4 4v22l-4 4Z" />
        </svg>
        <span style={{ fontSize: 34, fontWeight: 700, color: "#071233" }}>
          TwoKeys
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: 108,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 1,
            color: "#071233",
          }}
        >
          No agreement,
        </span>
        <span
          style={{
            fontSize: 108,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 1,
            color: "#0B4BFF",
          }}
        >
          no action.
        </span>
      </div>

      <span style={{ fontSize: 30, color: "#45537F", maxWidth: 900 }}>
        Everyone the plan resolves agrees to the exact same version, or the AI
        does not act.
      </span>
    </div>,
    size,
  );
}
