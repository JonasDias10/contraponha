import type { PublicProfile } from "@contraponha/types"
import { router } from "expo-router"
import { Pressable, StyleSheet, View } from "react-native"

import { FollowButton } from "@/components/profile/follow-button"
import { Avatar } from "@/components/ui/avatar"
import { AppText } from "@/components/ui/text"
import { useViewer } from "@/providers/session-provider"
import { paths } from "@/lib/paths"
import { space } from "@/lib/theme"

export interface PersonRowProps {
  person: PublicProfile
  isFollowing: boolean | undefined
}

export function PersonRow({ person, isFollowing }: PersonRowProps): React.JSX.Element {
  const viewer = useViewer()
  const isSelf = viewer?.id === person.id

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={person.displayName}
        onPress={() => router.push(paths.profile(person.handle))}
        style={styles.main}
      >
        <Avatar id={person.id} name={person.displayName} />
        <View style={styles.text}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {person.displayName}
          </AppText>
          <AppText variant="caption" tone="subtle" numberOfLines={1}>
            @{person.handle}
            {person.headline ? ` · ${person.headline}` : ""}
          </AppText>
          {person.bio ? (
            <AppText variant="small" tone="muted" numberOfLines={2}>
              {person.bio}
            </AppText>
          ) : null}
        </View>
      </Pressable>
      {isSelf ? null : (
        <FollowButton handle={person.handle} initialIsFollowing={isFollowing} size="sm" />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.md, paddingVertical: space.md },
  main: { flex: 1, flexDirection: "row", gap: space.md },
  text: { flex: 1, gap: 2 },
})
