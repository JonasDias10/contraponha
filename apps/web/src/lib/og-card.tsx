import { ImageResponse } from "next/og"

export const OG_SIZE = { width: 1200, height: 630 }

const COLORS = {
  surface: "#fbfbfa",
  ink: "#14161a",
  muted: "#5b6270",
  line: "#e3e6eb",
  brand: "#1f4fd8",
  accent: "#b3441b",
}

const TITLE_MAX_LENGTH = 140

export interface OgCardParams {
  eyebrow: string
  title: string
  byline: string | null
}

function shorten(text: string): string {
  return text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…` : text
}

// The image shown when a Contraponha link is shared elsewhere: the brand, the post title
// (or excerpt) or the person's name, and who wrote it. Flexbox only (Satori).
export function renderOgCard({ eyebrow, title, byline }: OgCardParams): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: COLORS.surface,
        borderTop: `12px solid ${COLORS.brand}`,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: COLORS.ink }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 22, height: 34, borderRadius: 999, background: COLORS.brand }} />
          <div style={{ width: 22, height: 34, borderRadius: 999, background: COLORS.accent }} />
        </div>
        <span style={{ fontWeight: 700 }}>contraponha</span>
        <span style={{ color: COLORS.muted, fontSize: 24 }}>· {eyebrow}</span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 60,
          lineHeight: 1.15,
          fontWeight: 700,
          color: COLORS.ink,
        }}
      >
        {shorten(title)}
      </div>
      <div
        style={{
          display: "flex",
          paddingTop: 24,
          borderTop: `2px solid ${COLORS.line}`,
          fontSize: 28,
          color: COLORS.muted,
        }}
      >
        {byline ?? ""}
      </div>
    </div>,
    OG_SIZE,
  )
}
