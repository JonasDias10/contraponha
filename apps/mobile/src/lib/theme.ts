import { useColorScheme } from "react-native"

// Design tokens. Keep values in sync with apps/web/src/app/globals.css.
// Rationale and usage rules: docs/design/design-system.md.
const palettes = {
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
  },
}

export type Palette = (typeof palettes)["light"]

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? palettes.dark : palettes.light
}
