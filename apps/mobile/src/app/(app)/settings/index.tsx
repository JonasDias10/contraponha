import { canModerate } from "@contraponha/client-core"
import { router, type Href } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import {
  Bell,
  BookOpen,
  Bookmark,
  ChevronRight,
  Database,
  Eye,
  FileText,
  Hash,
  Info,
  Lock,
  LogOut,
  Palette,
  Shield,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react-native"
import { Alert, Pressable, StyleSheet, View } from "react-native"

import { openLegalPage } from "@/components/auth/legal-links"
import { Screen, ScreenHeader, ScrollContent } from "@/components/ui/screen"
import { Card, Divider } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { getMobileEnv } from "@/lib/env"
import { useI18n } from "@/providers/i18n-provider"
import { useRequiredViewer, useSession } from "@/providers/session-provider"
import { space, TOUCH_TARGET } from "@/lib/theme"

interface MenuEntry {
  key: string
  label: string
  icon: LucideIcon
  onPress: () => void
  tone?: "default" | "danger"
}

interface MenuGroupProps {
  entries: MenuEntry[]
}

function MenuGroup({ entries }: MenuGroupProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <Card style={styles.group}>
      {entries.map(({ key, label, icon: Icon, onPress, tone = "default" }, index) => (
        <View key={key}>
          {index > 0 ? <Divider style={styles.divider} /> : null}
          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: palette.surfaceSunken },
            ]}
          >
            <Icon size={20} color={tone === "danger" ? palette.danger : palette.muted} />
            <AppText tone={tone === "danger" ? "danger" : "ink"} style={styles.label}>
              {label}
            </AppText>
            {tone === "danger" ? null : <ChevronRight size={18} color={palette.subtle} />}
          </Pressable>
        </View>
      ))}
    </Card>
  )
}

export default function SettingsIndex(): React.JSX.Element {
  const { t } = useI18n()
  const viewer = useRequiredViewer()
  const { signOut } = useSession()
  const go = (href: Href) => () => router.push(href)
  const hubUrl = getMobileEnv().EXPO_PUBLIC_HUB_URL

  const sections: MenuEntry[] = [
    {
      key: "profile",
      label: t("web.settings.profile"),
      icon: User,
      onPress: go("/settings/profile"),
    },
    {
      key: "account",
      label: t("web.settings.account"),
      icon: Shield,
      onPress: go("/settings/account"),
    },
    {
      key: "notifications",
      label: t("web.settings.notifications"),
      icon: Bell,
      onPress: go("/settings/notifications"),
    },
    {
      key: "interests",
      label: t("web.settings.interests"),
      icon: Hash,
      onPress: go("/settings/interests"),
    },
    { key: "data", label: t("web.settings.data"), icon: Database, onPress: go("/settings/data") },
    {
      key: "appearance",
      label: t("web.settings.appearance"),
      icon: Palette,
      onPress: go("/settings/appearance"),
    },
  ]

  const places: MenuEntry[] = [
    { key: "saved", label: t("web.nav.saved"), icon: Bookmark, onPress: go("/saved") },
    ...(canModerate(viewer) && hubUrl
      ? [
          {
            key: "moderation",
            label: t("web.nav.moderation"),
            icon: ShieldCheck,
            onPress: () => void WebBrowser.openBrowserAsync(hubUrl),
          },
        ]
      : []),
  ]

  const about: MenuEntry[] = [
    {
      key: "about",
      label: t("web.footer.about"),
      icon: Info,
      onPress: () => openLegalPage("about"),
    },
    {
      key: "guidelines",
      label: t("web.footer.guidelines"),
      icon: BookOpen,
      onPress: () => openLegalPage("guidelines"),
    },
    {
      key: "transparency",
      label: t("web.footer.transparency"),
      icon: Eye,
      onPress: () => openLegalPage("transparency"),
    },
    {
      key: "privacy",
      label: t("web.footer.privacy"),
      icon: Lock,
      onPress: () => openLegalPage("privacy"),
    },
    {
      key: "terms",
      label: t("web.footer.terms"),
      icon: FileText,
      onPress: () => openLegalPage("terms"),
    },
  ]

  const exit: MenuEntry[] = [
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

  return (
    <Screen>
      <ScreenHeader title={t("web.settings.title")} />
      <ScrollContent>
        <MenuGroup entries={places} />
        <MenuGroup entries={sections} />
        <MenuGroup entries={about} />
        <MenuGroup entries={exit} />
      </ScrollContent>
    </Screen>
  )
}

const styles = StyleSheet.create({
  group: { padding: 0, overflow: "hidden" },
  row: {
    minHeight: TOUCH_TARGET + 8,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  label: { flex: 1 },
  divider: { marginLeft: space.lg + 20 + space.md },
})
