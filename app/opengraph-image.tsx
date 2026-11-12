import { ImageResponse } from "next/og";

export const alt = "Lavie Studios — Event Branding, Corporate Identity & Advertising Agency";
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
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#090a0c",
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Top Row: Emblem + Brand Name + Tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <svg
              width="96"
              height="78"
              viewBox="0 0 81 66"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon
                points="49.73,34.65 43.84,42.12 41.32,45.32 33.19,55.64 30.67,58.84 25.34,65.60 24.38,65.60 19.06,58.84 16.54,55.64 8.41,45.32 5.89,42.12 0.00,34.65"
                fill="#c7cc2e"
              />
              <polygon
                points="80.90,30.67 32.93,30.67 38.26,23.91 40.78,20.70 48.91,10.39 51.43,7.18 56.92,0.22 62.40,7.18 64.93,10.39 73.05,20.70 75.58,23.91"
                fill="#deb58c"
              />
              <polygon
                points="24.15,30.67 0.00,30.67 0.00,0.00 5.66,7.18 8.18,10.39 16.31,20.70 18.83,23.91"
                fill="#f5a10a"
              />
              <polygon
                points="54.52,34.64 80.90,34.64 80.90,42.12 63.20,42.12 63.20,45.32 80.90,45.32 80.90,55.64 63.20,55.64 63.20,58.84 80.90,58.84 80.90,65.60 30.46,65.60 35.78,58.84 38.31,55.64 46.44,45.32 48.96,42.12"
                fill="#e65230"
              />
            </svg>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "34px", fontWeight: 800, letterSpacing: "-0.5px" }}>
                LAVIE STUDIOS
              </span>
              <span style={{ fontSize: "15px", color: "#c7cb2d", letterSpacing: "3px", textTransform: "uppercase" }}>
                the life in every place
              </span>
            </div>
          </div>

          <div
            style={{
              padding: "10px 22px",
              borderRadius: "999px",
              background: "rgba(199, 203, 45, 0.14)",
              border: "1px solid rgba(199, 203, 45, 0.45)",
              color: "#c7cb2d",
              fontSize: "16px",
              fontWeight: 700,
              letterSpacing: "1.5px",
            }}
          >
            STUDIOSLAVIE.COM
          </div>
        </div>

        {/* Center Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "980px" }}>
          <div
            style={{
              fontSize: "56px",
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: "-1.5px",
              color: "#ffffff",
            }}
          >
            Event Branding, Corporate Identity & Experiential Production.
          </div>
          <div
            style={{
              fontSize: "24px",
              lineHeight: 1.45,
              color: "#a1a1aa",
              maxWidth: "880px",
            }}
          >
            Spatial scenography, stage fabrication, corporate branding systems, event media, and out-of-home advertising across Nigeria.
          </div>
        </div>

        {/* Bottom Service Pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            paddingTop: "28px",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", gap: "14px" }}>
            {[
              "Event Branding & Scenography",
              "Corporate Identity",
              "Custom Craft Fabrication",
              "OOH Advertising",
            ].map((pill) => (
              <div
                key={pill}
                style={{
                  padding: "8px 18px",
                  borderRadius: "10px",
                  background: "#141619",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e4e4e7",
                  fontSize: "15px",
                  fontWeight: 600,
                }}
              >
                {pill}
              </div>
            ))}
          </div>
          <div style={{ fontSize: "16px", color: "#c7cb2d", fontWeight: 700 }}>
            RC - 9210438
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
