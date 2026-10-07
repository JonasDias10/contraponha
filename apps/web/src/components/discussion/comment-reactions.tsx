"use client"

import type { CommentView } from "@contraponha/types"
import { CircleCheck } from "lucide-react"
import { REACTION_ORDER } from "@contraponha/client-core"

import { commentActionClasses } from "@/components/discussion/comment-actions"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlays"
import { useReactions } from "@/hooks/use-reactions"
import { cn } from "@/lib/cn"
import { REACTION_ICONS } from "@/lib/reactions"

export interface CommentReactionsProps {
  comment: CommentView
}

export function CommentReactions({ comment }: CommentReactionsProps): React.JSX.Element {
  const { t } = useI18n()
  const viewer = useViewer()

  const reactions = useReactions({
    targetType: "comment",
    targetId: comment.id,
    postId: comment.postId,
    initialReactions: comment.viewer?.reactions ?? [],
    initialCounts: comment.reactionCounts,
  })

  const visibleReactions = REACTION_ORDER.filter(
    (kind) => reactions.counts[kind] > 0 || reactions.reactions.includes(kind),
  )

  return (
    <>
      {visibleReactions.map((kind) => {
        const Icon = REACTION_ICONS[kind]
        const isOn = reactions.reactions.includes(kind)

        return (
          <button
            key={kind}
            type="button"
            aria-pressed={isOn}
            disabled={!viewer}
            onClick={() => reactions.toggle(kind)}
            className={cn(commentActionClasses, isOn && "font-semibold text-brand")}
          >
            <Icon aria-hidden className="size-4" />
            {t(`web.reactions.${kind}`)} · {reactions.counts[kind]}
          </button>
        )
      })}
      {viewer ? (
        <Menu>
          <MenuTrigger className={commentActionClasses}>
            <CircleCheck aria-hidden className="size-4" />
            {t("web.post.react")}
          </MenuTrigger>
          <MenuContent align="start">
            {REACTION_ORDER.map((kind) => {
              const Icon = REACTION_ICONS[kind]

              return (
                <MenuItem key={kind} onSelect={() => reactions.toggle(kind)}>
                  <Icon
                    aria-hidden
                    className={cn("size-4", reactions.reactions.includes(kind) && "text-brand")}
                  />
                  {t(`web.reactions.${kind}`)}
                </MenuItem>
              )
            })}
          </MenuContent>
        </Menu>
      ) : null}
    </>
  )
}
