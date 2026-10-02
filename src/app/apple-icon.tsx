import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#1a56db" }}>
        <svg width={180} height={180} viewBox="0 0 32 32">
          <polygon points="9,6 15,17 3,17" fill="#ffffff" />
          <circle cx="22.5" cy="11.5" r="5" fill="#f5b301" />
          <rect x="11" y="19" width="10" height="10" rx="1.5" fill="#ffffff" opacity="0.9" transform="rotate(12 16 24)" />
        </svg>
      </div>
    ),
    size,
  );
}
