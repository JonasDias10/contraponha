"use client"

import { useEffect, useState } from "react"
import type { z } from "zod"

const SAVE_DELAY_MS = 800

export interface UseLocalDraftParams<TValue> {
  key: string
  value: TValue
  isEnabled: boolean
}

export interface LocalDraft {
  savedAt: number | null
  clear: () => void
}

export interface ReadDraftParams<TSchema extends z.ZodType> {
  key: string
  schema: TSchema
}

// Whatever is in storage is checked against the schema before use.
export function readDraft<TSchema extends z.ZodType>({
  key,
  schema,
}: ReadDraftParams<TSchema>): z.output<TSchema> | null {
  try {
    const stored = window.localStorage.getItem(key)

    if (!stored) return null

    const parsed = schema.safeParse(JSON.parse(stored))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

// Keeps unpublished writing on this device only. Storage can be unavailable (private mode),
// so every access is guarded and the editor works the same without it.
export function useLocalDraft<TValue>({
  key,
  value,
  isEnabled,
}: UseLocalDraftParams<TValue>): LocalDraft {
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const serialized = JSON.stringify(value)

  useEffect(() => {
    if (!isEnabled) return

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, serialized)

        setSavedAt(Date.now())
      } catch {
        // Saving is a convenience; nothing to do when the browser refuses it.
      }
    }, SAVE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [key, serialized, isEnabled])

  const clear = (): void => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Same as above.
    }
  }

  return { savedAt, clear }
}
