import type { Locale } from "@ponto/i18n"
import { useEffect, useState } from "react"

import { createMobileApiClient } from "@/lib/api"

const API_STATUS_TIMEOUT_MS = 3_000

export type ApiReadiness = "checking" | "online" | "offline"

export function useApiReadiness(locale: Locale): ApiReadiness {
  const [readiness, setReadiness] = useState<ApiReadiness>("checking")

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_STATUS_TIMEOUT_MS)
    let isActive = true

    void createMobileApiClient(locale)
      .health.isReady(controller.signal)
      .catch(() => false)
      .then((isReady) => {
        if (isActive) {
          setReadiness(isReady ? "online" : "offline")
        }
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
