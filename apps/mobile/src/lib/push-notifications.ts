import type { PushNotificationData } from "@contraponha/types"
import Constants from "expo-constants"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import type { Href } from "expo-router"
import { Platform } from "react-native"
import { z } from "zod"

import { paths } from "@/lib/paths"

const MODERATION_TYPES = new Set(["content_removed", "report_resolved"])

// Shown while the app is open too; the unread badge on the tab updates on its own.
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
})

// Written to app.json (extra.eas.projectId) by `eas init`.
const easExtraSchema = z.object({ eas: z.object({ projectId: z.string().min(1) }) })

function projectId(): string | undefined {
  const parsed = easExtraSchema.safeParse(Constants.expoConfig?.extra)

  return parsed.success ? parsed.data.eas.projectId : undefined
}

// Null on simulators, without an EAS project id, or when the person declines.
export async function requestExpoPushToken(): Promise<string | null> {
  const id = projectId()

  if (!Device.isDevice || !id) return null

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Contraponha",
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const current = await Notifications.getPermissionsAsync()
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync()

  if (!permission.granted) return null

  const token = await Notifications.getExpoPushTokenAsync({ projectId: id })

  return token.data
}

function isPushData(value: unknown): value is PushNotificationData {
  return typeof value === "object" && value !== null && "notificationId" in value
}

// Same destinations as tapping the notification in the list; moderation decisions open
// the notifications screen, where the decision and the rule are explained.
export function pushTarget(data: unknown): Href {
  if (!isPushData(data) || MODERATION_TYPES.has(data.type)) return "/notifications"

  if (data.postId) {
    return data.commentId
      ? paths.comment({ postId: data.postId, commentId: data.commentId })
      : paths.post(data.postId)
  }

  return data.actorHandle ? paths.profile(data.actorHandle) : "/notifications"
}
