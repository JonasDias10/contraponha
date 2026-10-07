import { useSyncExternalStore } from "react"

function subscribe(): () => void {
  return () => undefined
}

// False during server rendering and hydration, true afterwards: for UI that depends on
// browser-only state (theme, clipboard) without hydration mismatches.
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
