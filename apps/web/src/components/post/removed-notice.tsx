"use client"

import type { CommunityRule, ContentRemoval } from "@ponto/types"
import { ShieldAlert } from "lucide-react"
import Link from "next/link"

import { useI18n } from "@/components/providers/i18n-provider"
import { paths } from "@/lib/paths"

export interface RemovedNoticeProps {
  removedBy: ContentRemoval | null
  rule: CommunityRule | null
  subject: "post" | "comment"
}

// Moderation decisions always name the rule that was applied.
export function RemovedNotice({ removedBy, rule, subject }: RemovedNoticeProps): React.JSX.Element {
  const { t } = useI18n()

  if (removedBy !== "moderation") {
    return (
      <p className="text-sm italic text-subtle">
        {subject === "post" ? t("web.post.removedByAuthor") : t("web.comment.removedByAuthor")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-sunken px-4 py-3.5">
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <ShieldAlert aria-hidden className="size-4 text-muted" />
        {subject === "post"
          ? t("web.post.removedByModeration")
          : t("web.comment.removedByModeration")}
      </p>
      {rule ? (
        <p className="text-sm text-muted">
          {t("web.post.removedRule", { rule: t(`web.rules.${rule}`) })}
        </p>
      ) : null}
      <Link
        href={rule ? paths.guidelineRule(rule) : "/guidelines"}
        className="text-sm font-semibold text-brand"
      >
        {t("web.post.understandRule")}
      </Link>
    </div>
  )
}
