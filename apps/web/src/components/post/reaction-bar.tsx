"use client"

import { ReactionKind, type ReactionCounts } from "@ponto/types"
import { BookText, CircleCheck, Lightbulb, RefreshCw, type LucideIcon } from "lucide-react"

import { useI18n } from "@/components/providers/i18n-provider"
import { cn } from "@/lib/cn"

export const REACTION_ICONS: Record<ReactionKind, LucideIcon> = {
  [ReactionKind.GOOD_ARGUMENT]: CircleCheck,
  [ReactionKind.INSIGHTFUL]: Lightbulb,
  [ReactionKind.CHANGED_MY_MIND]: RefreshCw,
  [ReactionKind.NEEDS_SOURCE]: BookText,
}

export const REACTION_ORDER = [
  ReactionKind.GOOD_ARGUMENT,
  ReactionKind.INSIGHTFUL,
  ReactionKind.CHANGED_MY_MIND,
  ReactionKind.NEEDS_SOURCE,
] as const

export interface ReactionBarProps {
  reactions: ReactionKind[]
  counts: ReactionCounts
  onToggle: (kind: ReactionKind) => void
  isDisabled?: boolean
}

// Labels are always written out; "needs a source" uses the warning tone because it is a
// constructive request, not a dislike.
export function ReactionBar({
  reactions,
  counts,
  onToggle,
  isDisabled = false,
}: ReactionBarProps): React.JSX.Element {
  const { t } = useI18n()

  return (
    <div role="group" aria-label={t("web.reactions.label")} className="flex flex-wrap gap-2">
      {REACTION_ORDER.map((kind) => {
        const Icon = REACTION_ICONS[kind]
        const isOn = reactions.includes(kind)
        const isSource = kind === ReactionKind.NEEDS_SOURCE

        return (
          <button
            key={kind}
            type="button"
            aria-pressed={isOn}
            disabled={isDisabled}
            onClick={() => onToggle(kind)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 pl-3 text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,scale] duration-150 active:scale-95 disabled:opacity-60",
              isOn
                ? isSource
                  ? "border-transparent bg-warning-soft font-semibold text-warning"
                  : "border-transparent bg-brand-soft font-semibold text-brand"
                : "border-line bg-surface-raised text-ink hover:border-line-strong",
            )}
          >
            <Icon
              aria-hidden
              className={cn("size-4.5", isOn ? "" : isSource ? "text-warning" : "text-muted")}
            />
            {t(`web.reactions.${kind}`)}
            <span className={cn("tabular-nums", isOn ? "" : "text-subtle")}>{counts[kind]}</span>
          </button>
        )
      })}
    </div>
  )
}

export interface ReactionSummaryProps {
  counts: ReactionCounts
  commentCount?: number
  trailing?: React.ReactNode
}

// Only the two most given reactions, in words; numbers stay quiet and views never show.
export function ReactionSummary({
  counts,
  commentCount,
  trailing,
}: ReactionSummaryProps): React.JSX.Element | null {
  const { t } = useI18n()

  const top = REACTION_ORDER.filter((kind) => counts[kind] > 0)
    .toSorted((a, b) => counts[b] - counts[a])
    .slice(0, 2)

  const parts = [
    ...top.map((kind) => t(`web.reactions.summary_${kind}`, { count: counts[kind] })),
    ...(commentCount ? [t("web.post.summaryContributions", { count: commentCount })] : []),
  ]

  if (parts.length === 0 && !trailing) return null

  return (
    <p className="flex flex-wrap items-center text-[13.5px] text-muted">
      {parts.map((part, index) => (
        <span key={part} className="inline-flex items-center">
          {index > 0 ? (
            <span aria-hidden className="mx-1.5 text-subtle">
              ·
            </span>
          ) : null}
          {part}
        </span>
      ))}
      {trailing ? (
        <>
          {parts.length > 0 ? (
            <span aria-hidden className="mx-1.5 text-subtle">
              ·
            </span>
          ) : null}
          {trailing}
        </>
      ) : null}
    </p>
  )
}
