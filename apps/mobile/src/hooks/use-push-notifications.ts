import { queryKeys } from "@contraponha/client-core"
import { PushPlatform } from "@contraponha/types"
import { useQueryClient } from "@tanstack/react-query"
import * as Notifications from "expo-notifications"
import { router } from "expo-router"
import { useEffect } from "react"
import { Platform } from "react-native"

import { pushTarget, requestExpoPushToken } from "@/lib/push-notifications"
import { STORAGE_KEYS, writeStored } from "@/lib/storage"
import { useApi, useSession } from "@/providers/session-provider"

const PLATFORM = Platform.OS === "ios" ? PushPlatform.IOS : PushPlatform.ANDROID

// Registers this device for pushes once the person is signed in and onboarded, refreshes
// the unread count when one arrives, and opens the right screen when one is tapped.
export function usePushNotifications(isActive: boolean): void {
  const api = useApi()
  const { isSignedIn } = useSession()
  const queryClient = useQueryClient()
  const lastResponse = Notifications.useLastNotificationResponse()

  useEffect(() => {
    if (!isSignedIn || !isActive) return

    const register = async (): Promise<void> => {
      const token = await requestExpoPushToken()

      if (!token) return

      await api.notifications.registerPushToken({ token, platform: PLATFORM })

      await writeStored({ key: STORAGE_KEYS.pushToken, value: token })
    }

    // Pushes are a convenience; the app works the same without them.
    register().catch(() => undefined)
  }, [api, isSignedIn, isActive])

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll })
    })

    return () => subscription.remove()
  }, [queryClient])

  useEffect(() => {
    if (!isActive || !lastResponse) return

    router.push(pushTarget(lastResponse.notification.request.content.data))

    void Notifications.clearLastNotificationResponseAsync()
  }, [isActive, lastResponse])
}
