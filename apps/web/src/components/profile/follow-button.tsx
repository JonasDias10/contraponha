"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { queryKeys } from "@contraponha/client-core"
import { useFollowMutation } from "@contraponha/client-core/react"

import { Button, type ButtonProps, useApi, useI18n, useViewer } from "@contraponha/web-ui"

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
