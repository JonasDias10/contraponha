import AsyncStorage from "@react-native-async-storage/async-storage"
import { useEffect, useState } from "react"
import type { z } from "zod"

const SAVE_DELAY_MS = 800

export interface UseDeviceDraftParams<TSchema extends z.ZodType> {
  key: string
  schema: TSchema
  value: unknown
  isEnabled: boolean
}

export interface DeviceDraft<TValue> {
  restored: TValue | null
  isRestoring: boolean
  savedAt: number | null
  clear: () => void
}

// Keeps unpublished writing on this phone only; stored data is checked before it is restored.
export function useDeviceDraft<TSchema extends z.ZodType>({
  key,
  schema,
  value,
  isEnabled,
}: UseDeviceDraftParams<TSchema>): DeviceDraft<z.output<TSchema>> {
  const [restored, setRestored] = useState<z.output<TSchema> | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const serialized = JSON.stringify(value)

  useEffect(() => {
    void AsyncStorage.getItem(key)
      .then((stored) => {
        if (!stored) return

        const parsed = schema.safeParse(JSON.parse(stored))

        if (parsed.success) setRestored(parsed.data)
      })
      .catch(() => undefined)
      .finally(() => setIsRestoring(false))
  }, [key, schema])

  useEffect(() => {
    if (!isEnabled) return

    const timer = setTimeout(() => {
      void AsyncStorage.setItem(key, serialized).then(() => setSavedAt(Date.now()))
    }, SAVE_DELAY_MS)

    return () => clearTimeout(timer)
  }, [key, serialized, isEnabled])

  return {
    restored,
    isRestoring,
    savedAt,
    clear: () => void AsyncStorage.removeItem(key),
  }
}
