import { useColorScheme } from "react-native"

import { palettes, type ColorScheme, type Palette } from "@/lib/theme"
import { usePreferences } from "@/providers/preferences-provider"

export function useColorSchemeName(): ColorScheme {
  const { theme } = usePreferences()
  const system = useColorScheme()

  if (theme !== "system") return theme

  return system === "dark" ? "dark" : "light"
}

export function usePalette(): Palette {
  return palettes[useColorSchemeName()]
}
