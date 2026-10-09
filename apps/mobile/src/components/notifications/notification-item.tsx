import { notificationText, queryKeys } from "@contraponha/client-core"
import type { NotificationView } from "@contraponha/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { router } from "expo-router"
import { BookText, MessageSquare, ShieldCheck, Star } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"

import { openLegalPage } from "@/components/auth/legal-links"
import { RelativeTime } from "@/components/post/relative-time"
import { Avatar } from "@/components/ui/avatar"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { paths } from "@/lib/paths"
import { space } from "@/lib/theme"

interface IconCircleProps {
  background: string
  children: React.ReactNode
}

function IconCircle({ background, children }: IconCircleProps): React.JSX.Element {
  return <View style={[styles.icon, { backgroundColor: background }]}>{children}</View>
}

interface IconProps {
  notification: NotificationView
}

function NotificationIcon({ notification }: IconProps): React.JSX.Element {
  const palette = usePalette()

  switch (notification.type) {
    case "comment_highlighted":
      return (
        <IconCircle background={palette.accentSoft}>
          {<Star size={20} color={palette.accent} />}
        </IconCircle>
      )
    case "source_requested":
      return (
        <IconCircle background={palette.warningSoft}>
          {<BookText size={20} color={palette.warning} />}
        </IconCircle>
      )
    case "content_removed":
    case "report_resolved":
      return (
        <IconCircle background={palette.brandSoft}>
          {<ShieldCheck size={20} color={palette.brand} />}
        </IconCircle>
      )
    default: {
      const [first, second] = notification.actors

      if (!first) {
        return (
          <IconCircle background={palette.surfaceSunken}>
            {<MessageSquare size={20} color={palette.muted} />}
          </IconCircle>
        )
      }

      return (
        <View style={styles.faces}>
          <Avatar
            id={first.id}
            name={first.displayName}
            src={first.avatarUrl}
            size={second ? "sm" : "md"}
          />
          {second ? (
            <View style={[styles.second, { borderColor: palette.surface }]}>
              <Avatar id={second.id} name={second.displayName} src={second.avatarUrl} size="sm" />
            </View>
          ) : null}
        </View>
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
  const palette = usePalette()
  const queryClient = useQueryClient()

  const markRead = useMutation({
    mutationFn: () => api.notifications.markRead(notification.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll }),
  })

  const { post, commentId } = notification

  const isModeration =
    notification.type === "content_removed" || notification.type === "report_resolved"

  const [firstActor] = notification.actors

  const open = (): void => {
    if (!notification.isRead) markRead.mutate()

    if (isModeration) {
      openLegalPage("guidelines")

      return
    }

    if (post) {
      router.push(commentId ? paths.comment({ postId: post.id, commentId }) : paths.post(post.id))

      return
    }

    if (firstActor) router.push(paths.profile(firstActor.handle))
  }

  const action = isModeration
    ? t("web.notifications.seeDecision")
    : notification.type === "source_requested" && post
      ? t("web.notifications.addSource")
      : t("web.notifications.seeDiscussion")

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={action}
      onPress={open}
      style={({ pressed }) => [
        styles.row,
        { borderTopColor: palette.line },
        !notification.isRead && { backgroundColor: palette.brandSoft },
        pressed && { backgroundColor: palette.surfaceSunken },
      ]}
    >
      <NotificationIcon notification={notification} />
      <View style={styles.body}>
        <AppText variant={notification.isRead ? "body" : "bodyStrong"}>
          {notificationText({ notification, t })}
        </AppText>
        {notification.commentExcerpt ? (
          <AppText variant="small" tone="muted" numberOfLines={3} style={styles.serif}>
            “{notification.commentExcerpt}”
          </AppText>
        ) : (post?.title ?? post?.excerpt) ? (
          <AppText variant="small" tone="muted" numberOfLines={2}>
            {post.title ?? post.excerpt}
          </AppText>
        ) : null}
        <View style={styles.meta}>
          <AppText variant="smallStrong" tone="brand">
            {action}
          </AppText>
          <RelativeTime value={notification.createdAt} variant="caption" tone="subtle" />
        </View>
      </View>
      {notification.isRead ? null : (
        <View
          accessibilityLabel={t("web.notifications.unread")}
          style={[styles.dot, { backgroundColor: palette.brand }]}
        />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    paddingHorizontal: space.gutter,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  faces: { flexDirection: "row", width: 40 },
  second: { marginLeft: -10, borderWidth: 2, borderRadius: 999 },
  body: { flex: 1, gap: 4 },
  serif: { fontStyle: "italic" },
  meta: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
})
