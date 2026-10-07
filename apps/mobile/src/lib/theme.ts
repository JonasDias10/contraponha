import type { TextStyle } from "react-native"

// Design tokens. Keep values in sync with apps/web/src/app/globals.css.
// Rationale and usage rules: docs/design/design-system.md.
export const palettes = {
  light: {
    surface: "#fbfbfa",
    surfaceRaised: "#ffffff",
    surfaceSunken: "#f2f3f1",
    ink: "#14161a",
    muted: "#5b6270",
    subtle: "#636a77",
    line: "#e3e6eb",
    lineStrong: "#838a97",
    brand: "#1f4fd8",
    brandHover: "#1a43b8",
    brandSoft: "#ebf0fd",
    onBrand: "#ffffff",
    accent: "#b3441b",
    accentSoft: "#fbede6",
    success: "#1d7a4b",
    successSoft: "#e6f4ec",
    warning: "#8a5a00",
    warningSoft: "#fbf1dc",
    danger: "#b42318",
    dangerSoft: "#fdecea",
    onDanger: "#ffffff",
    inverse: "#14161a",
    onInverse: "#f3f4f6",
    scrim: "rgba(20, 22, 26, 0.48)",
    avatars: [
      { bg: "#e6edfc", ink: "#1c46c2" },
      { bg: "#fbe9df", ink: "#9a3a17" },
      { bg: "#e2f2ea", ink: "#1a6b42" },
      { bg: "#f3e8f8", ink: "#6d2f8a" },
      { bg: "#f8f0d8", ink: "#7a5000" },
      { bg: "#e3f0f4", ink: "#1c5e72" },
    ],
  },
  dark: {
    surface: "#111317",
    surfaceRaised: "#181b20",
    surfaceSunken: "#0b0c0f",
    ink: "#eceef2",
    muted: "#a3aab6",
    subtle: "#8d94a1",
    line: "#2a2e35",
    lineStrong: "#6b7380",
    brand: "#7d9cff",
    brandHover: "#9bb3ff",
    brandSoft: "#1b2442",
    onBrand: "#0b1020",
    accent: "#f0905f",
    accentSoft: "#2c1c15",
    success: "#5cc98f",
    successSoft: "#12261b",
    warning: "#e3b04f",
    warningSoft: "#2a2110",
    danger: "#ff8a7a",
    dangerSoft: "#2e1512",
    onDanger: "#1a0b09",
    inverse: "#eceef2",
    onInverse: "#14161a",
    scrim: "rgba(0, 0, 0, 0.6)",
    avatars: [
      { bg: "#1d2747", ink: "#a9bcff" },
      { bg: "#33201a", ink: "#f4a984" },
      { bg: "#15291f", ink: "#7fd6a6" },
      { bg: "#2a1c33", ink: "#d4a6ec" },
      { bg: "#2c2412", ink: "#e8c46f" },
      { bg: "#142a31", ink: "#82cde1" },
    ],
  },
}

export type Palette = (typeof palettes)["light"]

export type ColorScheme = keyof typeof palettes

export const fonts = {
  serif: "Literata_400Regular",
  serifItalic: "Literata_400Regular_Italic",
  serifSemibold: "Literata_600SemiBold",
  serifBold: "Literata_700Bold",
  sans: "InstrumentSans_400Regular",
  sansMedium: "InstrumentSans_500Medium",
  sansSemibold: "InstrumentSans_600SemiBold",
  sansBold: "InstrumentSans_700Bold",
}

export const type = {
  display: { fontFamily: fonts.serifSemibold, fontSize: 38, lineHeight: 42 },
  heading1: { fontFamily: fonts.serifSemibold, fontSize: 28, lineHeight: 34 },
  heading2: { fontFamily: fonts.serifSemibold, fontSize: 22, lineHeight: 28 },
  postTitle: { fontFamily: fonts.serifSemibold, fontSize: 21, lineHeight: 27 },
  reading: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 28 },
  heading3: { fontFamily: fonts.sansSemibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.sansSemibold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fonts.sansSemibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: fonts.sansSemibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
} satisfies Record<string, TextStyle>

export type TypeVariant = keyof typeof type

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  gutter: 16,
}

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  pill: 999,
}

export const TOUCH_TARGET = 44
