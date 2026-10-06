import type {
  NotificationPreferences,
  NotificationView,
  Page,
  UnreadNotificationCount,
} from "@ponto/types"
import {
  notificationPageSchema,
  notificationPreferencesSchema,
  unreadNotificationCountSchema,
  type NotificationListQuery,
  type UpdateNotificationPreferencesInput,
} from "@ponto/validation"

import { emptyResponseSchema, withQuery, type HttpClient } from "../http.js"

export interface NotificationsResource {
  list(query?: NotificationListQuery): Promise<Page<NotificationView>>
  unreadCount(): Promise<UnreadNotificationCount>
  markRead(notificationId: string): Promise<void>
  markAllRead(): Promise<void>
  getPreferences(): Promise<NotificationPreferences>
  updatePreferences(input: UpdateNotificationPreferencesInput): Promise<NotificationPreferences>
}

export function createNotificationsResource(request: HttpClient): NotificationsResource {
  return {
    list: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/notifications", query }),
        schema: notificationPageSchema,
      }),
    unreadCount: () =>
      request({
        method: "GET",
        path: "/notifications/unread-count",
        schema: unreadNotificationCountSchema,
      }),
    markRead: async (notificationId) => {
      await request({
        method: "POST",
        path: `/notifications/${encodeURIComponent(notificationId)}/read`,
        schema: emptyResponseSchema,
      })
    },
    getPreferences: () =>
      request({
        method: "GET",
        path: "/notifications/preferences",
        schema: notificationPreferencesSchema,
      }),
    updatePreferences: (input) =>
      request({
        method: "PATCH",
        path: "/notifications/preferences",
        body: input,
        schema: notificationPreferencesSchema,
      }),
    markAllRead: async () => {
      await request({
        method: "POST",
        path: "/notifications/read-all",
        schema: emptyResponseSchema,
      })
    },
  }
}
