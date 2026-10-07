"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"

import { THEME_STORAGE_KEY, THEMES, type Theme } from "@/lib/theme"

const DARK_QUERY = "(prefers-color-scheme: dark)"
const CHANGE_EVENT = "contraponha:theme-change"

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return THEMES.find((theme) => theme === stored) ?? "system"
  } catch {
    return "system"
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange)

  window.addEventListener("storage", onChange)

  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)

    window.removeEventListener("storage", onChange)
  }
}

function applyTheme(theme: Theme): void {
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia(DARK_QUERY).matches)

  document.documentElement.classList.toggle("dark", isDark)
}

export interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

// The chosen theme lives in this browser; "system" follows the OS setting live.
export function useTheme(): ThemeState {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as const)

  useEffect(() => {
    applyTheme(theme)

    if (theme !== "system") return

    const media = window.matchMedia(DARK_QUERY)
    const follow = (): void => applyTheme("system")

    media.addEventListener("change", follow)

    return () => media.removeEventListener("change", follow)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Without storage the choice lasts until the page reloads.
    }

    applyTheme(next)

    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return { theme, setTheme }
}
