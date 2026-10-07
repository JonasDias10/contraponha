import { Stack } from "expo-router"

import { usePalette } from "@/hooks/use-palette"

export default function AuthLayout(): React.JSX.Element {
  const palette = usePalette()

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.surface } }}
    />
  )
}
