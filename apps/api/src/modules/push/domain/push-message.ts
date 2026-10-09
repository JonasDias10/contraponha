import { notificationText } from "@contraponha/client-core"
import type { Translate } from "@contraponha/i18n"
import type { NotificationView, PushNotificationData } from "@contraponha/types"

import type { PushMessage } from "#src/infrastructure/push/push-sender.js"

export interface ToPushMessageParams {
  token: string
  notification: NotificationView
  badge: number
  t: Translate
}

export function pushDataOf(notification: NotificationView): PushNotificationData {
  return {
    notificationId: notification.id,
    type: notification.type,
    postId: notification.post?.id ?? null,
    commentId: notification.commentId,
    actorHandle: notification.actors[0]?.handle ?? null,
  }
}

// Same sentence the notifications screen shows; the post title, when there is one,
// becomes the push title so the person knows which discussion it is about.
export function toPushMessage({ token, notification, badge, t }: ToPushMessageParams): PushMessage {
  return {
    to: token,
    title: notification.post?.title ?? t("app.name"),
    body: notificationText({ notification, t }),
    data: { ...pushDataOf(notification) },
    badge,
  }
}
