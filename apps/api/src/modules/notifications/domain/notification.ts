import type { NotificationRow } from "@ponto/database"
import type { NotificationView } from "@ponto/types"

import { toPublicProfile, type User } from "#src/modules/users/domain/user.js"

export type Notification = NotificationRow

export interface ToNotificationViewParams {
  notification: Notification
  actor: User | undefined
}

export function toNotificationView({
  notification,
  actor,
}: ToNotificationViewParams): NotificationView {
  return {
    id: notification.id,
    type: notification.type,
    actor: actor ? toPublicProfile(actor) : null,
    postId: notification.postId,
    commentId: notification.commentId,
    isRead: notification.readAt !== null,
    createdAt: notification.createdAt.toISOString(),
  }
}
