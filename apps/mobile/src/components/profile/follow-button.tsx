import { queryKeys } from "@contraponha/client-core"
import { useFollowMutation } from "@contraponha/client-core/react"
import { useQuery } from "@tanstack/react-query"

import { Button, type ButtonSize } from "@/components/ui/button"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"

export interface FollowButtonProps {
  handle: string
  initialIsFollowing?: boolean
  size?: ButtonSize
}

export function FollowButton({
  handle,
  initialIsFollowing,
  size = "md",
}: FollowButtonProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const follow = useFollowMutation()

  const status = useQuery({
    queryKey: queryKeys.followStatus(handle),
    queryFn: () => api.follows.getStatus(handle),
    initialData: initialIsFollowing === undefined ? undefined : { isFollowing: initialIsFollowing },
  })

  const isFollowing = follow.isPending
    ? follow.variables.isFollowing
    : (status.data?.isFollowing ?? false)

  return (
    <Button
      size={size}
      variant={isFollowing ? "secondary" : "primary"}
      accessibilityState={{ selected: isFollowing }}
      label={isFollowing ? t("web.profile.following") : t("web.profile.follow")}
      onPress={() => follow.mutate({ handle, isFollowing: !isFollowing })}
    />
  )
}
