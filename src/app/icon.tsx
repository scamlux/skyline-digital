import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon: the brand sun rising over the horizon, on the night sky.
export default function Icon() {
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
            bottom: 9,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #FFAE5C, #E8517C)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 10,
            width: "100%",
            height: 2,
            background: "linear-gradient(90deg, #FFAE5C, #E8517C)",
          }}
        />
      </div>
    ),
    size,
  );
}
