import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Skyline Digital — web, mobile & AI development agency";

// Social/search share card: night sky, brand wordmark, rising sun.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "#1A2238",
          padding: "72px",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >
        {/* Rising sun */}
        <div
          style={{
            position: "absolute",
            right: 90,
            bottom: -120,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "radial-gradient(circle at 38% 32%, #FFAE5C, #E8517C 72%)",
            boxShadow: "0 0 120px 40px rgba(232,81,124,0.35)",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 6,
            color: "#8B93A7",
            textTransform: "uppercase",
          }}
        >
          Digital Agency · Tashkent
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              color: "#F5F7FA",
              lineHeight: 1.05,
              maxWidth: 820,
            }}
          >
            Websites, apps & AI that bring you clients
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#8B93A7" }}>
            skyline.digital · estimate your project in 2 minutes
          </div>
        </div>

        {/* Horizon line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "100%",
            height: 8,
            background: "linear-gradient(90deg, #FFAE5C, #E8517C)",
          }}
        />
      </div>
    ),
    size,
  );
}
