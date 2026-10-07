"use client"

import * as Popover from "@radix-ui/react-popover"
import type { PostView } from "@contraponha/types"
import { Bookmark, CircleCheck, MessageSquare, Share } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { REACTION_ICONS, ReactionBar } from "@/components/post/reaction-bar"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { useBookmarkMutation } from "@/hooks/use-post-mutations"
import type { ReactionsState } from "@/hooks/use-reactions"
import { cn } from "@/lib/cn"
import { paths } from "@/lib/paths"

const actClasses =
  "inline-flex h-10 min-w-11 items-center justify-center gap-[7px] rounded-[10px] px-2.5 text-sm font-medium text-muted no-underline hover:bg-surface-sunken"

export interface PostActionsProps {
  post: PostView
  reactions: ReactionsState
}

export function PostActions({ post, reactions }: PostActionsProps): React.JSX.Element {
  const { t } = useI18n()
  const viewer = useViewer()
  const router = useRouter()
  const bookmark = useBookmarkMutation()

  const isBookmarked = bookmark.isPending
    ? bookmark.variables.isSaving
    : (post.viewer?.isBookmarked ?? false)

  const [chosen] = reactions.reactions
  const ChosenIcon = chosen ? REACTION_ICONS[chosen] : CircleCheck

  const share = async (): Promise<void> => {
    const url = new URL(paths.post(post.id), window.location.origin).toString()

    if (typeof navigator.share === "function") {
      await navigator.share({ title: post.title ?? undefined, url }).catch(() => undefined)

      return
    }

    await navigator.clipboard.writeText(url)

    toast(t("web.common.copied"))
  }

  const requireViewer = (action: () => void): void => {
    if (!viewer) {
      router.push("/login")

      return
    }

    action()
  }

  return (
    <div className="-mx-2.5 -mb-2 flex items-center gap-1">
      <Popover.Root>
        <Popover.Trigger
          className={cn(actClasses, chosen && "font-semibold text-brand")}
          onClick={(event) => {
            if (!viewer) {
              event.preventDefault()

              router.push("/login")
            }
          }}
        >
          <ChosenIcon aria-hidden className="size-5" />
          {chosen ? t(`web.reactions.${chosen}`) : t("web.post.react")}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="top"
            align="start"
            sideOffset={6}
            className="z-40 max-w-[calc(100vw-32px)] rounded-[14px] border border-line bg-surface-raised p-2 shadow-e2"
          >
            <ReactionBar
              reactions={reactions.reactions}
              counts={reactions.counts}
              onToggle={reactions.toggle}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <Link href={paths.discussion(post.id)} className={actClasses}>
        <MessageSquare aria-hidden className="size-5" />
        {t("web.post.contribute")}
      </Link>
      <span className="flex-1" />
      <button
        type="button"
        aria-pressed={isBookmarked}
        aria-label={isBookmarked ? t("web.post.unsave") : t("web.post.save")}
        title={isBookmarked ? t("web.post.saved") : t("web.post.save")}
        onClick={() =>
          requireViewer(() => bookmark.mutate({ postId: post.id, isSaving: !isBookmarked }))
        }
        className={cn(actClasses, isBookmarked && "text-brand")}
      >
        <Bookmark aria-hidden className={cn("size-5", isBookmarked && "fill-current")} />
      </button>
      <button
        type="button"
        aria-label={t("web.post.share")}
        onClick={() => void share()}
        className={actClasses}
      >
        <Share aria-hidden className="size-5" />
      </button>
    </div>
  )
}
