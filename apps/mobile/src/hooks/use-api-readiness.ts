import { API_READINESS_TIMEOUT_MS } from "@contraponha/config"
import type { Locale } from "@contraponha/i18n"
import { useEffect, useState } from "react"

import { createMobileApiClient } from "@/lib/api"

export type ApiReadiness = "checking" | "online" | "offline"

export function useApiReadiness(locale: Locale): ApiReadiness {
  const [readiness, setReadiness] = useState<ApiReadiness>("checking")

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_READINESS_TIMEOUT_MS)
    let isActive = true

    void createMobileApiClient(locale)
      .health.isReady(controller.signal)
      .catch(() => false)
      .then((isReady) => {
        if (isActive) setReadiness(isReady ? "online" : "offline")
      })
      .finally(() => clearTimeout(timer))

    return () => {
      isActive = false

      clearTimeout(timer)

      controller.abort()
    }
  }, [locale])

  return readiness
}
