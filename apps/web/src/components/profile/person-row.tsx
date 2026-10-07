"use client"

import type { PublicProfile } from "@ponto/types"
import Link from "next/link"

import { FollowButton } from "@/components/profile/follow-button"
import { useViewer } from "@/components/providers/viewer-provider"
import { Avatar } from "@/components/ui/avatar"
import { paths } from "@/lib/paths"

export interface PersonRowProps {
  person: PublicProfile
  isFollowing: boolean | undefined
}

export function PersonRow({ person, isFollowing }: PersonRowProps): React.JSX.Element {
  const viewer = useViewer()
  const isSelf = viewer?.id === person.id

  return (
    <li className="flex items-start gap-3 border-t border-line px-5 py-4 first:border-t-0">
      <Link href={paths.profile(person.handle)} tabIndex={-1} aria-hidden>
        <Avatar id={person.id} name={person.displayName} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          href={paths.profile(person.handle)}
          className="truncate font-semibold text-ink no-underline hover:underline"
        >
          {person.displayName}
        </Link>
        <span className="truncate text-[13px] text-subtle">
          @{person.handle}
          {person.headline ? ` · ${person.headline}` : ""}
        </span>
        {person.bio ? <p className="mt-1 line-clamp-2 text-sm text-muted">{person.bio}</p> : null}
      </div>
      {isSelf ? null : (
        <FollowButton handle={person.handle} initialIsFollowing={isFollowing} size="sm" />
      )}
    </li>
  )
}
