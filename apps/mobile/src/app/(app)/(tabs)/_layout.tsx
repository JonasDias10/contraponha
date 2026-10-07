import { useUnreadCount } from "@contraponha/client-core/react"
import { router, Tabs } from "expo-router"
import { Bell, House, PenLine, Search, User } from "lucide-react-native"
import { StyleSheet, View, type ColorValue } from "react-native"

import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useSession } from "@/providers/session-provider"
import { fonts } from "@/lib/theme"

interface BellIconProps {
  color: ColorValue
  hasUnread: boolean
}

// New activity is a dot, never a number.
function BellIcon({ color, hasUnread }: BellIconProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <View>
      <Bell size={24} color={color} />
      {hasUnread ? (
        <View
          style={[styles.dot, { backgroundColor: palette.ink, borderColor: palette.surface }]}
        />
      ) : null}
    </View>
  )
}

export default function TabsLayout(): React.JSX.Element {
  const palette = usePalette()
  const { t } = useI18n()
  const { isSignedIn } = useSession()
  const unread = useUnreadCount({ isEnabled: isSignedIn })

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.ink,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.line },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 },
        sceneStyle: { backgroundColor: palette.surface },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("web.nav.home"),
          tabBarIcon: ({ color }) => <House size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("web.nav.search"),
          tabBarIcon: ({ color }) => <Search size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: t("web.nav.write"),
          tabBarIcon: ({ color }) => <PenLine size={24} color={color} />,
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault()

            router.push("/compose")
          },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t("web.nav.notifications"),
          tabBarAccessibilityLabel:
            unread > 0
              ? `${t("web.nav.notifications")}, ${t("web.nav.newNotifications", { count: unread })}`
              : undefined,
          tabBarIcon: ({ color }) => <BellIcon color={color} hasUnread={unread > 0} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: t("web.nav.profile"),
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
})
