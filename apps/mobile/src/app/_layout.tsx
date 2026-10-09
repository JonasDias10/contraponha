import "@/lib/polyfills"

import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from "@expo-google-fonts/instrument-sans"
import {
  Literata_400Regular,
  Literata_400Regular_Italic,
  Literata_600SemiBold,
  Literata_700Bold,
} from "@expo-google-fonts/literata"
import { focusManager } from "@tanstack/react-query"
import { useFonts } from "expo-font"
import { SplashScreen, Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import * as SystemUI from "expo-system-ui"
import { useEffect } from "react"
import { AppState, Platform } from "react-native"

import { useColorSchemeName, usePalette } from "@/hooks/use-palette"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { AppProviders } from "@/providers/app-providers"
import { usePreferences } from "@/providers/preferences-provider"
import { useSession, useViewerQuery } from "@/providers/session-provider"

void SplashScreen.preventAutoHideAsync()

// Refetch stale queries when the app returns to the foreground, like window focus on the web.
AppState.addEventListener("change", (status) => {
  if (Platform.OS !== "web") focusManager.setFocused(status === "active")
})

function RootNavigator(): React.JSX.Element | null {
  const palette = usePalette()
  const scheme = useColorSchemeName()
  const preferences = usePreferences()
  const { isSignedIn, isRestoring } = useSession()
  const { viewer, isLoading } = useViewerQuery()
  const isReady = preferences.isLoaded && !isRestoring && !isLoading
  const needsOnboarding = viewer !== null && !viewer.isOnboarded

  usePushNotifications(isReady && isSignedIn && viewer !== null && !needsOnboarding)

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.surface)
  }, [palette.surface])

  useEffect(() => {
    if (isReady) void SplashScreen.hideAsync()
  }, [isReady])

  if (!isReady) return null

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.surface } }}
      >
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isSignedIn && needsOnboarding}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={isSignedIn && !needsOnboarding}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="reset-password" />
      </Stack>
    </>
  )
}

export default function RootLayout(): React.JSX.Element | null {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    Literata_400Regular,
    Literata_400Regular_Italic,
    Literata_600SemiBold,
    Literata_700Bold,
  })

  if (!fontsLoaded && !fontError) return null

  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  )
}
