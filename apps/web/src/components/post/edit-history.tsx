"use client"

import type { PostView } from "@contraponha/types"
import { useQuery } from "@tanstack/react-query"
import { formatDateTime, queryKeys, toVersions } from "@contraponha/client-core"

import { useApi } from "@/components/providers/app-providers"
import { Markdown } from "@/components/post/markdown"
import { useI18n } from "@/components/providers/i18n-provider"
import { Card } from "@/components/ui/surfaces"
import { cn } from "@/lib/cn"

export interface EditHistoryProps {
  post: PostView
}

export function EditHistory({ post }: EditHistoryProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const api = useApi()

  const query = useQuery({
    queryKey: queryKeys.postRevisions(post.id),
    queryFn: () => api.posts.listRevisions(post.id),
  })

  const versions = query.data ? toVersions({ post, revisions: query.data.revisions }) : []

  return (
    <Card className="flex flex-col gap-5 p-6">
      <h2 className="text-lg font-semibold">{t("web.history.title")}</h2>
      <p className="text-sm text-muted">{t("web.history.lead", { count: post.revisionCount })}</p>
      <ol className="flex flex-col gap-5">
        {versions.map((version) => (
          <li key={version.number} className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-3">
            <span
              aria-hidden
              className={cn(
                "mt-1 size-3 rounded-full border-2",
                version.isCurrent
                  ? "border-brand bg-brand"
                  : "border-line-strong bg-surface-raised",
              )}
            />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">
                {version.isCurrent
                  ? t("web.history.current", { number: version.number })
                  : version.number === 1
                    ? t("web.history.original")
                    : t("web.history.version", { number: version.number })}
              </p>
              <p className="text-[13px] text-subtle">
                {formatDateTime({ value: version.createdAt, locale })}
              </p>
              {version.reason ? (
                <p className="text-[13px] text-subtle">
                  {t("web.history.reason", { reason: version.reason })}
                </p>
              ) : null}
              {version.isCurrent ? null : (
                <details className="text-sm">
                  <summary className="cursor-pointer font-semibold text-brand">
                    {t("web.history.open")}
                  </summary>
                  <div className="mt-2 flex flex-col gap-2 font-serif text-[15px]/relaxed text-muted">
                    {version.title ? <p className="font-semibold">{version.title}</p> : null}
                    <Markdown text={version.body} />
                  </div>
                </details>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}
