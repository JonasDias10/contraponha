import { formatCount, formatMonthYear, queryKeys, recognitionText } from "@contraponha/client-core"
import type { ProfileView } from "@contraponha/types"
import { useQuery } from "@tanstack/react-query"
import { router } from "expo-router"
import {
  CalendarDays,
  CircleCheck,
  Flag,
  Link2,
  LogOut,
  MapPin,
  MoreHorizontal,
  Share2,
  SlidersHorizontal,
} from "lucide-react-native"
import { useState } from "react"
import { Alert, Pressable, Share, StyleSheet, View } from "react-native"

import { ReportSheet } from "@/components/post/report-sheet"
import { FollowButton } from "@/components/profile/follow-button"
import { ActionSheet, type ActionSheetItem } from "@/components/ui/action-sheet"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { IconButton } from "@/components/ui/icon-button"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi, useSession, useViewer } from "@/providers/session-provider"
import { openExternalUrl } from "@/lib/open-url"
import { paths, shareUrls } from "@/lib/paths"
import { radius, space } from "@/lib/theme"

export interface ProfileHeaderProps {
  profile: ProfileView
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function ProfileHeader({ profile }: ProfileHeaderProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const api = useApi()
  const palette = usePalette()
  const viewer = useViewer()
  const { signOut } = useSession()
  const [panel, setPanel] = useState<"menu" | "report" | null>(null)
  const isSelf = viewer?.id === profile.id

  const followedBy = useQuery({
    queryKey: queryKeys.followedBy(profile.handle),
    queryFn: () => api.users.followedBy(profile.handle),
    enabled: !isSelf,
  })

  const mutuals = followedBy.data?.people ?? []
  const mutualNames = mutuals.map(({ displayName }) => displayName.split(" ")[0]).join(", ")
  const others = (followedBy.data?.total ?? 0) - mutuals.length

  const share = (): void => {
    const url = shareUrls.profile(profile.handle)

    void Share.share({ message: url, url }).catch(() => undefined)
  }

  const items: ActionSheetItem[] = isSelf
    ? [
        { key: "share", label: t("web.post.share"), icon: Share2, onPress: share },
        {
          key: "settings",
          label: t("web.nav.settings"),
          icon: SlidersHorizontal,
          onPress: () => router.push("/settings"),
        },
        {
          key: "signOut",
          label: t("web.nav.signOut"),
          icon: LogOut,
          tone: "danger",
          onPress: () =>
            Alert.alert(t("web.settings.signOutTitle"), t("web.settings.signOutLead"), [
              { text: t("web.common.cancel"), style: "cancel" },
              { text: t("web.nav.signOut"), style: "destructive", onPress: () => void signOut() },
            ]),
        },
      ]
    : [
        { key: "share", label: t("web.post.share"), icon: Share2, onPress: share },
        {
          key: "report",
          label: t("web.profile.report"),
          icon: Flag,
          tone: "danger",
          onPress: () => setPanel("report"),
        },
      ]

  const stats = [
    { value: profile.postCount, label: t("web.profile.statPosts", { count: profile.postCount }) },
    {
      value: profile.followerCount,
      label: t("web.profile.statFollowers", { count: profile.followerCount }),
      onPress: () => router.push(paths.followers(profile.handle)),
    },
    {
      value: profile.followingCount,
      label: t("web.profile.statFollowing", { count: profile.followingCount }),
      onPress: () => router.push(paths.following(profile.handle)),
    },
  ]

  return (
    <View style={styles.header}>
      <View style={styles.top}>
        <Avatar id={profile.id} name={profile.displayName} size="xl" />
        <View style={styles.actions}>
          {isSelf ? (
            <Button
              variant="secondary"
              size="sm"
              label={t("web.profile.editProfile")}
              onPress={() => router.push("/settings/profile")}
            />
          ) : (
            <FollowButton
              handle={profile.handle}
              initialIsFollowing={profile.viewer?.isFollowing}
              size="sm"
            />
          )}
          <IconButton
            icon={MoreHorizontal}
            label={t("web.nav.accountMenu")}
            onPress={() => setPanel("menu")}
          />
        </View>
      </View>
      <View style={styles.names}>
        <AppText variant="heading1" accessibilityRole="header">
          {profile.displayName}
        </AppText>
        <View style={styles.handleRow}>
          <AppText tone="subtle">
            @{profile.handle}
            {profile.pronouns ? ` · ${profile.pronouns}` : ""}
          </AppText>
          {profile.viewer?.isFollowedBy ? <Chip label={t("web.profile.followsYou")} /> : null}
        </View>
      </View>
      {profile.bio ? <AppText variant="reading">{profile.bio}</AppText> : null}
      <View style={styles.details}>
        {profile.headline ? (
          <AppText variant="small" tone="muted">
            {profile.headline}
          </AppText>
        ) : null}
        {profile.location ? (
          <View style={styles.detail}>
            <MapPin size={16} color={palette.muted} />
            <AppText variant="small" tone="muted">
              {profile.location}
            </AppText>
          </View>
        ) : null}
        {profile.website ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => profile.website && openExternalUrl(profile.website)}
            style={styles.detail}
          >
            <Link2 size={16} color={palette.brand} />
            <AppText variant="small" tone="brand">
              {hostOf(profile.website)}
            </AppText>
          </Pressable>
        ) : null}
        <View style={styles.detail}>
          <CalendarDays size={16} color={palette.muted} />
          <AppText variant="small" tone="muted">
            {t("web.profile.joined", {
              date: formatMonthYear({ value: profile.createdAt, locale }),
            })}
          </AppText>
        </View>
      </View>
      <View style={styles.stats}>
        {stats.map(({ value, label, onPress }) => (
          <Pressable
            key={label}
            accessibilityRole={onPress ? "link" : "text"}
            disabled={!onPress}
            onPress={onPress}
          >
            <AppText variant="small" tone="muted">
              <AppText variant="smallStrong">{formatCount({ value, locale })}</AppText> {label}
            </AppText>
          </Pressable>
        ))}
      </View>
      {mutuals.length > 0 ? (
        <View style={styles.mutuals}>
          <View style={styles.faces}>
            {mutuals.map((person, index) => (
              <View
                key={person.id}
                style={[styles.face, index > 0 && styles.overlap, { borderColor: palette.surface }]}
              >
                <Avatar id={person.id} name={person.displayName} size="xs" />
              </View>
            ))}
          </View>
          <AppText variant="caption" tone="subtle" style={styles.flex}>
            {others > 0
              ? t("web.profile.followedByMore", { names: mutualNames, count: others })
              : t("web.profile.followedBy", { names: mutualNames })}
          </AppText>
        </View>
      ) : null}
      {profile.recognition ? (
        <Pressable
          accessibilityRole="button"
          accessibilityHint={t("web.profile.whatIsThis")}
          onPress={() =>
            Alert.alert(t("web.profile.whatIsThis"), t("web.profile.recognitionExplain"))
          }
          style={[styles.recognition, { backgroundColor: palette.surfaceSunken }]}
        >
          <CircleCheck size={20} color={palette.brand} />
          <AppText variant="small" style={styles.flex}>
            {recognitionText({ recognition: profile.recognition, t })}
          </AppText>
        </Pressable>
      ) : null}
      <ActionSheet isOpen={panel === "menu"} items={items} onClose={() => setPanel(null)} />
      <ReportSheet
        targetType="user"
        targetId={profile.id}
        isOpen={panel === "report"}
        onClose={() => setPanel(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  header: { gap: space.lg },
  top: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  actions: { flexDirection: "row", alignItems: "center", gap: space.xs },
  names: { gap: 2 },
  handleRow: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  details: { flexDirection: "row", flexWrap: "wrap", columnGap: space.xl, rowGap: space.xs },
  detail: { flexDirection: "row", alignItems: "center", gap: 4 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.xl },
  mutuals: { flexDirection: "row", alignItems: "center", gap: space.sm },
  faces: { flexDirection: "row" },
  face: { borderWidth: 2, borderRadius: 999 },
  overlap: { marginLeft: -8 },
  flex: { flex: 1 },
  recognition: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: 14,
    borderRadius: radius.lg,
  },
})
