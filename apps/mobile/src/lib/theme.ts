import { useColorScheme } from "react-native"

const palettes = {
  light: {
    brand: "#1f4fd8",
    ink: "#14161a",
    muted: "#5b6270",
    line: "#e3e6eb",
    surface: "#fbfbfa",
    success: "#10b981",
    danger: "#f43f5e",
  },
  dark: {
    brand: "#7d9cff",
    ink: "#eceef2",
    muted: "#9aa1ad",
    line: "#2a2e35",
    surface: "#111317",
    success: "#10b981",
    danger: "#f43f5e",
  },
}

export type Palette = (typeof palettes)["light"]

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? palettes.dark : palettes.light
}
