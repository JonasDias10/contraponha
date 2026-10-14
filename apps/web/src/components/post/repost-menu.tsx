"use client"

import { formatCount } from "@contraponha/client-core"
import { useRepostMutation } from "@contraponha/client-core/react"
import type { PostView } from "@contraponha/types"
import {
  cn,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  useI18n,
  useViewer,
} from "@contraponha/web-ui"
import { PenLine, Repeat2 } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"

export interface RepostMenuProps {
  post: PostView
  className: string
}

// Repost as is, or quote with your own text in the composer.
export function RepostMenu({ post, className }: RepostMenuProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const viewer = useViewer()
  const router = useRouter()
  const repost = useRepostMutation()

  const hasReposted = repost.isPending
    ? repost.variables.isReposting
    : (post.viewer?.hasReposted ?? false)

  return (
    <Menu>
      <MenuTrigger
        className={cn(className, hasReposted && "font-semibold text-success")}
        aria-label={t("web.repost.repost")}
        onClick={(event) => {
          if (!viewer) {
            event.preventDefault()

            router.push("/login")
          }
        }}
      >
        <Repeat2 aria-hidden className="size-5" />
        {post.repostCount > 0 ? formatCount({ value: post.repostCount, locale }) : null}
      </MenuTrigger>
      <MenuContent align="start">
        <MenuItem onSelect={() => repost.mutate({ postId: post.id, isReposting: !hasReposted })}>
          <Repeat2 aria-hidden className="size-4" />
          {hasReposted ? t("web.repost.undo") : t("web.repost.repost")}
        </MenuItem>
        <MenuItem asChild>
          <Link href={`/compose?quote=${post.id}` as Route}>
            <PenLine aria-hidden className="size-4" />
            {t("web.repost.quote")}
          </Link>
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
