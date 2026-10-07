import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import { Animated, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { radius, space } from "@/lib/theme"

type ToastTone = "neutral" | "success" | "error"

interface ToastState {
  message: string
  tone: ToastTone
}

interface ToastApi {
  show: (message: string) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const VISIBLE_MS = 2800
const FADE_MS = 180

interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const palette = usePalette()
  const insets = useSafeAreaInsets()
  const [toast, setToast] = useState<ToastState | null>(null)
  const [opacity] = useState(() => new Animated.Value(0))
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const present = useCallback(
    (next: ToastState): void => {
      if (timer.current) clearTimeout(timer.current)

      setToast(next)

      Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start()

      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(
          () => setToast(null),
        )
      }, VISIBLE_MS)
    },
    [opacity],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show: (message) => present({ message, tone: "neutral" }),
      success: (message) => present({ message, tone: "success" }),
      error: (message) => present({ message, tone: "error" }),
    }),
    [present],
  )

  return (
    <ToastContext value={api}>
      {children}
      {toast ? (
        <Animated.View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity,
              bottom: insets.bottom + 72,
              backgroundColor: toast.tone === "error" ? palette.danger : palette.inverse,
            },
          ]}
        >
          <AppText
            variant="small"
            style={{ color: toast.tone === "error" ? palette.onDanger : palette.onInverse }}
          >
            {toast.message}
          </AppText>
        </Animated.View>
      ) : null}
    </ToastContext>
  )
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext)

  if (!value) throw new Error("useToast must be used inside ToastProvider")

  return value
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: space.gutter,
    right: space.gutter,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
})
