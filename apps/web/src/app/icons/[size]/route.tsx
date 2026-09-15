import { ImageResponse } from "next/og";

/** App icons for the PWA manifest: /icons/192 and /icons/512 (ink-blue circle with the Ello quote mark). */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const px = size === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div style={{ width: px, height: px, display: "flex", alignItems: "center", justifyContent: "center", background: "#3346D3" }}>
        <span style={{ color: "#FFFFFF", fontSize: px * 0.7, fontWeight: 800, lineHeight: 1, marginTop: px * 0.22 }}>“</span>
      </div>
    ),
    { width: px, height: px, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
