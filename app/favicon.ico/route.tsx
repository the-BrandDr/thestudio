import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#090a0c",
          borderRadius: "12px",
        }}
      >
        <svg
          width="46"
          height="38"
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
      </div>
    ),
    {
      width: 64,
      height: 64,
      headers: {
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    }
  );
}
