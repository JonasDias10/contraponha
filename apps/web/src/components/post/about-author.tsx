"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { queryKeys, recognitionText } from "@contraponha/client-core"

import { Avatar, Card, useApi, useI18n, VerifiedBadge } from "@contraponha/web-ui"
import { paths } from "@/lib/paths"

export interface AboutAuthorProps {
  handle: string
}

export function AboutAuthor({ handle }: AboutAuthorProps): React.JSX.Element | null {
  const { t } = useI18n()
  const api = useApi()

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile(handle),
    queryFn: () => api.users.getByHandle(handle),
  })

  if (!profile) return null

  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
        {t("web.post.aboutAuthor")}
      </h2>
      <Link
        href={paths.profile(profile.handle)}
        className="flex items-center gap-3 text-ink no-underline"
      >
        <Avatar id={profile.id} name={profile.displayName} src={profile.avatarUrl} />
        <span className="flex flex-col">
          <span className="flex items-center gap-1.5 font-semibold">
            {profile.displayName}
            <VerifiedBadge verification={profile.verification} />
          </span>
          <span className="text-[13px] text-subtle">@{profile.handle}</span>
        </span>
      </Link>
      {profile.bio ? <p className="text-sm text-muted">{profile.bio}</p> : null}
      {profile.recognition ? (
        <p className="text-[13px] text-subtle">
          {recognitionText({ recognition: profile.recognition, t })}
        </p>
      ) : null}
    </Card>
  )
}
