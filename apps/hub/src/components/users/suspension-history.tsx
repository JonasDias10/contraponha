"use client"

import { formatDate, formatDateTime } from "@contraponha/client-core"
import type { SuspensionView } from "@contraponha/types"
import { Card, Chip, useI18n } from "@contraponha/web-ui"

export interface SuspensionHistoryProps {
  suspensions: SuspensionView[]
}

export function SuspensionHistory({ suspensions }: SuspensionHistoryProps): React.JSX.Element {
  const { t } = useI18n()

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t("hub.user.history")}</h2>
      {suspensions.length === 0 ? (
        <p className="text-sm text-muted">{t("hub.user.noHistory")}</p>
      ) : (
        <Card className="overflow-hidden">
          <ol>
            {suspensions.map((suspension) => (
              <SuspensionItem key={suspension.id} suspension={suspension} />
            ))}
          </ol>
        </Card>
      )}
    </section>
  )
}

interface SuspensionItemProps {
  suspension: SuspensionView
}

function SuspensionItem({ suspension }: SuspensionItemProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const { endsAt, liftedAt, moderator } = suspension

  const period = endsAt
    ? t("hub.user.until", { date: formatDateTime({ value: endsAt, locale }) })
    : t("hub.user.forever")

  return (
    <li className="flex flex-col gap-1 border-t border-line px-5 py-4 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{t(`web.rules.${suspension.rule}`)}</span>
        {suspension.isActive ? <Chip tone="warning">{t("hub.user.current")}</Chip> : null}
      </div>
      <p className="text-sm text-muted">
        {formatDate({ value: suspension.createdAt, locale })} · {period}
        {moderator ? ` · ${t("hub.user.by", { name: moderator.displayName })}` : ""}
      </p>
      {liftedAt ? (
        <p className="text-sm text-muted">
          {t("hub.user.liftedOn", { date: formatDateTime({ value: liftedAt, locale }) })}
        </p>
      ) : null}
      {suspension.note ? <p className="text-sm">{suspension.note}</p> : null}
    </li>
  )
}
