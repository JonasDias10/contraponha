"use client"

import type { PublicProfile } from "@ponto/types"
import Link from "next/link"

import { RelativeTime } from "@/components/post/relative-time"
import { useI18n } from "@/components/providers/i18n-provider"
import { Avatar } from "@/components/ui/avatar"
import { Chip } from "@/components/ui/badges"
import { paths } from "@/lib/paths"

export interface AuthorLineProps {
  author: PublicProfile | null
  createdAt: string
  size?: "sm" | "md" | "lg"
  isPostAuthor?: boolean
  hasAvatar?: boolean
  extra?: React.ReactNode
  trailing?: React.ReactNode
}

function Separator(): React.JSX.Element {
  return (
    <span aria-hidden className="mx-1.5 text-subtle">
      ·
    </span>
  )
}

export function AuthorLine({
  author,
  createdAt,
  size = "md",
  isPostAuthor = false,
  hasAvatar = true,
  extra,
  trailing,
}: AuthorLineProps): React.JSX.Element {
  const { t } = useI18n()
  const isDeleted = !author || author.isDeleted

  return (
    <div className="flex items-center gap-3">
      {!hasAvatar ? null : isDeleted ? (
        <span
          aria-hidden
          className="grid size-10 flex-none place-items-center rounded-full bg-surface-sunken text-subtle"
        >
          ·
        </span>
      ) : (
        <Link href={paths.profile(author.handle)} tabIndex={-1} aria-hidden>
          <Avatar id={author.id} name={author.displayName} size={size} />
        </Link>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          {isDeleted ? (
            <span className="text-[15px] leading-tight font-semibold text-subtle">
              {t("web.common.deletedAccount")}
            </span>
          ) : (
            <Link
              href={paths.profile(author.handle)}
              className="truncate text-[15px] leading-tight font-semibold text-ink no-underline hover:underline"
            >
              {author.displayName}
            </Link>
          )}
          {isPostAuthor ? <Chip>{t("web.common.author")}</Chip> : null}
        </span>
        <span className="flex flex-wrap items-center text-[13px] leading-snug text-subtle">
          {author && !isDeleted ? <span>@{author.handle}</span> : null}
          {author?.headline ? (
            <>
              <Separator />
              <span>{author.headline}</span>
            </>
          ) : null}
          <Separator />
          <RelativeTime value={createdAt} />
          {extra ? (
            <>
              <Separator />
              {extra}
            </>
          ) : null}
        </span>
      </div>
      {trailing}
    </div>
  )
}
