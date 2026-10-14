import { verificationLabel } from "@contraponha/client-core"
import type { Translate } from "@contraponha/i18n"
import type { PublicProfile, Verification } from "@contraponha/types"
import { BadgeCheck } from "lucide-react-native"
import { View } from "react-native"

import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"

export interface VerifiedBadgeProps {
  verification: Verification | null
  size?: number
}

export function VerifiedBadge({
  verification,
  size = 16,
}: VerifiedBadgeProps): React.JSX.Element | null {
  const { t } = useI18n()
  const palette = usePalette()

  if (!verification) return null

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={verificationLabel({ verification, t })}
    >
      <BadgeCheck size={size} color={palette.brand} />
    </View>
  )
}

export interface PersonLabelParams {
  person: PublicProfile
  t: Translate
}

// Pressable rows replace their children's labels with their own, so the badge is spoken here.
export function personLabel({ person, t }: PersonLabelParams): string {
  if (!person.verification) return person.displayName

  return `${person.displayName}, ${verificationLabel({ verification: person.verification, t })}`
}
