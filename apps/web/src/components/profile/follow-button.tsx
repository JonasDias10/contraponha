"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { Button, type ButtonProps } from "@/components/ui/button"
import { useFollowMutation } from "@/hooks/use-follow"
import { queryKeys } from "@/lib/query-keys"

export interface FollowButtonProps {
  handle: string
  initialIsFollowing?: boolean
  size?: ButtonProps["size"]
}

export function FollowButton({
  handle,
  initialIsFollowing,
  size,
}: FollowButtonProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const router = useRouter()
  const follow = useFollowMutation()

  const status = useQuery({
    queryKey: queryKeys.followStatus(handle),
    queryFn: () => api.follows.getStatus(handle),
    enabled: viewer !== null,
    initialData: initialIsFollowing === undefined ? undefined : { isFollowing: initialIsFollowing },
  })

  const isFollowing = follow.isPending
    ? follow.variables.isFollowing
    : (status.data?.isFollowing ?? false)

  return (
    <Button
      size={size}
      variant={isFollowing ? "secondary" : "primary"}
      aria-pressed={isFollowing}
      onClick={() => {
        if (!viewer) {
          router.push("/login")

          return
        }

        follow.mutate({ handle, isFollowing: !isFollowing })
      }}
    >
      {isFollowing ? t("web.profile.following") : t("web.profile.follow")}
    </Button>
  )
}
