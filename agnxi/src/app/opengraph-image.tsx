import { ImageResponse } from "next/og";

export const alt = "Agnxi — Production-grade AI agent hosting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0f14",
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "#a5b4fc",
            textShadow: "0 0 24px rgba(99, 102, 241, 0.2)",
          }}
        >
          Agnxi
        </span>
      </div>
    ),
    { ...size }
  );
}
