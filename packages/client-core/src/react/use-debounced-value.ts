"use client"

import { useEffect, useState } from "react"

export interface UseDebouncedValueParams<T> {
  value: T
  delayMs: number
}

export function useDebouncedValue<T>({ value, delayMs }: UseDebouncedValueParams<T>): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)

    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
