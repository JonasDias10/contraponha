export const THEME_STORAGE_KEY = "ponto:theme"

export const THEMES = ["system", "light", "dark"] as const

export type Theme = (typeof THEMES)[number]

// Runs before the first paint (inlined in the root layout) so the page never flashes the
// wrong theme. Kept as a plain string: it executes outside React and the bundle.
export const THEME_BOOT_SCRIPT = `(() => {
  try {
    const stored = localStorage.getItem("${THEME_STORAGE_KEY}")
    const isDark = stored === "dark" || (stored !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList.toggle("dark", isDark)
  } catch {}
})()`
