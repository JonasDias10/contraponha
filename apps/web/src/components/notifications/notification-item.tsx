"use client"

import type { NotificationView } from "@contraponha/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { BookText, MessageSquare, ShieldCheck, Star } from "lucide-react"
import Link from "next/link"
import { notificationText, queryKeys } from "@contraponha/client-core"

import { Avatar, cn, RelativeTime, UnreadDot, useApi, useI18n } from "@contraponha/web-ui"
import { paths } from "@/lib/paths"

interface IconProps {
  notification: NotificationView
}

function NotificationIcon({ notification }: IconProps): React.JSX.Element {
  const iconClasses = "grid size-10 flex-none place-items-center rounded-full"

  switch (notification.type) {
    case "comment_highlighted":
      return (
        <span aria-hidden className={cn(iconClasses, "bg-accent-soft text-accent")}>
          <Star className="size-5" />
        </span>
      )
    case "source_requested":
      return (
        <span aria-hidden className={cn(iconClasses, "bg-warning-soft text-warning")}>
          <BookText className="size-5" />
        </span>
      )
    case "content_removed":
    case "report_resolved":
      return (
        <span aria-hidden className={cn(iconClasses, "bg-brand-soft text-brand")}>
          <ShieldCheck className="size-5" />
        </span>
      )
    default: {
      const [first, second] = notification.actors

      if (!first) {
        return (
          <span aria-hidden className={cn(iconClasses, "bg-surface-sunken text-muted")}>
            <MessageSquare className="size-5" />
          </span>
        )
      }

      return (
        <span aria-hidden className="flex flex-none">
          <Avatar
            id={first.id}
            name={first.displayName}
            src={first.avatarUrl}
            size={second ? "sm" : "md"}
          />
          {second ? (
            <Avatar
              id={second.id}
              name={second.displayName}
              src={second.avatarUrl}
              size="sm"
              className="-ml-2 ring-2 ring-surface-raised"
            />
          ) : null}
        </span>
      )
    }
  }
}

export interface NotificationItemProps {
  notification: NotificationView
}

export function NotificationItem({ notification }: NotificationItemProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const queryClient = useQueryClient()

  const markRead = useMutation({
    mutationFn: () => api.notifications.markRead(notification.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll }),
  })

  const { post, commentId } = notification

  const isModeration =
    notification.type === "content_removed" || notification.type === "report_resolved"

  const target = post
    ? commentId
      ? paths.comment({ postId: post.id, commentId })
      : paths.post(post.id)
    : notification.actors[0]
      ? paths.profile(notification.actors[0].handle)
      : null

  const open = (): void => {
    if (!notification.isRead) markRead.mutate()
  }

  return (
    <li
      className={cn(
        "relative flex items-start gap-3 border-t border-line px-4 py-3.5 transition-colors first:border-t-0 hover:bg-surface-sunken sm:gap-3.5 sm:px-5 sm:py-4",
        !notification.isRead && "bg-brand-soft/40",
      )}
    >
      <NotificationIcon notification={notification} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={cn("text-[15px]", !notification.isRead && "font-medium")}>
          {notificationText({ notification, t })}
        </p>
        {notification.commentExcerpt ? (
          <p className="line-clamp-3 font-serif text-sm text-muted">
            “{notification.commentExcerpt}”
          </p>
        ) : (post?.title ?? post?.excerpt) ? (
          <p className="line-clamp-2 text-sm text-muted">{post.title ?? post.excerpt}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {target ? (
            <Link
              href={target}
              onClick={open}
              className="text-sm font-semibold text-brand after:absolute after:inset-0"
            >
              {isModeration
                ? t("web.notifications.seeDecision")
                : notification.type === "source_requested" && post
                  ? t("web.notifications.addSource")
                  : t("web.notifications.seeDiscussion")}
            </Link>
          ) : null}
          <span className="text-[13px] text-subtle">
            <RelativeTime value={notification.createdAt} />
          </span>
        </div>
      </div>
      {notification.isRead ? null : (
        <span className="mt-2">
          <UnreadDot label={t("web.notifications.unread")} />
        </span>
      )}
    </li>
  )
}
