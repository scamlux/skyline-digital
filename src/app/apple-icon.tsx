import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon: larger sunrise mark.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#1A2238",
          alignItems: "flex-end",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 52,
            width: 108,
            height: 108,
            borderRadius: "50%",
            background: "radial-gradient(circle at 38% 32%, #FFAE5C, #E8517C 72%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 58,
            width: "100%",
            height: 6,
            background: "linear-gradient(90deg, #FFAE5C, #E8517C)",
          }}
        />
      </div>
    ),
    size,
  );
}
