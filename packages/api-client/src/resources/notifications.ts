import type { NotificationView, Page, UnreadNotificationCount } from "@ponto/types"
import {
  notificationPageSchema,
  unreadNotificationCountSchema,
  type PaginationQuery,
} from "@ponto/validation"

import { emptyResponseSchema, withQuery, type HttpClient } from "../http.js"

export interface NotificationsResource {
  list(query?: PaginationQuery): Promise<Page<NotificationView>>
  unreadCount(): Promise<UnreadNotificationCount>
  markRead(notificationId: string): Promise<void>
  markAllRead(): Promise<void>
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
    markAllRead: async () => {
      await request({
        method: "POST",
        path: "/notifications/read-all",
        schema: emptyResponseSchema,
      })
    },
  }
}
