"use client"

import { ReportStatus, type CommunityRule, type ReportView } from "@ponto/types"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Inbox } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { RelativeTime } from "@/components/post/relative-time"
import { RuleSelect } from "@/components/post/rule-select"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { Chip } from "@/components/ui/badges"
import { Button } from "@/components/ui/button"
import { Segmented, SegmentedItem, SegmentedList } from "@/components/ui/controls"
import { Field, Input } from "@/components/ui/field"
import { Card, EmptyState, Panel } from "@/components/ui/surfaces"
import { errorMessage } from "@/lib/api-errors"
import { paths } from "@/lib/paths"
import { queryKeys } from "@/lib/query-keys"

const FIRST_PAGE: string | undefined = undefined

function isStatus(value: string): value is ReportStatus {
  return Object.values(ReportStatus).some((status) => status === value)
}

export function ReportQueue(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const [status, setStatus] = useState<ReportStatus>(ReportStatus.OPEN)

  const query = useInfiniteQuery({
    queryKey: queryKeys.reports(status),
    queryFn: ({ pageParam }) => api.moderation.listReports({ status, cursor: pageParam }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  const reports = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[25px] font-semibold">{t("web.moderation.queue")}</h1>
        <Segmented value={status} onValueChange={(value) => isStatus(value) && setStatus(value)}>
          <SegmentedList>
            <SegmentedItem value={ReportStatus.OPEN}>{t("web.moderation.open")}</SegmentedItem>
            <SegmentedItem value={ReportStatus.RESOLVED}>
              {t("web.moderation.resolved")}
            </SegmentedItem>
            <SegmentedItem value={ReportStatus.DISMISSED}>
              {t("web.moderation.dismissed")}
            </SegmentedItem>
          </SegmentedList>
        </Segmented>
      </div>
      <Link href="/moderation/actions" className="self-start text-sm font-semibold text-brand">
        {t("web.moderation.actions")}
      </Link>
      {reports.length === 0 && !query.isPending ? (
        <Card>
          <EmptyState
            icon={<Inbox className="size-8" />}
            title={t("web.moderation.emptyTitle")}
            description={t("web.moderation.emptyBody")}
          />
        </Card>
      ) : (
        reports.map((report) => <ReportCard key={report.id} report={report} />)
      )}
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          className="self-center"
          isLoading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("web.common.loadMore")}
        </Button>
      ) : null}
    </div>
  )
}

interface ReportCardProps {
  report: ReportView
}

interface Resolution {
  resolution: "remove_content" | "dismiss"
}

function ReportCard({ report }: ReportCardProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const queryClient = useQueryClient()
  const [rule, setRule] = useState<CommunityRule>()
  const [note, setNote] = useState("")

  const resolve = useMutation({
    mutationFn: ({ resolution }: Resolution) =>
      api.moderation.resolveReport({
        reportId: report.id,
        input: {
          resolution,
          rule: resolution === "remove_content" ? rule : undefined,
          note: note.trim() || undefined,
        },
      }),
    onSuccess: () => toast.success(t("web.moderation.resolvedToast")),
    onError: (error) => toast.error(errorMessage({ error, t })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["moderation"] }),
  })

  const target =
    report.targetType === "post"
      ? paths.post(report.targetId)
      : report.targetType === "user" && report.targetAuthor
        ? paths.profile(report.targetAuthor.handle)
        : null

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="neutral">{t(`web.moderation.target_${report.targetType}`)}</Chip>
        <Chip tone="warning">{t(`web.report.${report.reason}`)}</Chip>
        <span className="text-[13px] text-subtle">
          {t("web.moderation.reportedBy", {
            name: report.reporter?.displayName ?? t("web.common.deletedAccount"),
          })}{" "}
          · <RelativeTime value={report.createdAt} />
        </span>
      </div>
      {report.excerpt ? (
        <Panel className="px-4 py-3 font-serif text-base/relaxed">“{report.excerpt}”</Panel>
      ) : null}
      {report.targetAuthor ? (
        <p className="text-sm text-muted">
          {report.targetAuthor.displayName} · @{report.targetAuthor.handle}
        </p>
      ) : null}
      {report.details ? <p className="text-sm">{report.details}</p> : null}
      {target ? (
        <Link href={target} className="self-start text-sm font-semibold text-brand">
          {t("web.moderation.openTarget")}
        </Link>
      ) : null}
      {report.status === "open" ? (
        <div className="flex flex-col gap-4 border-t border-line pt-4">
          {report.targetType === "user" ? null : (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-sm font-semibold">{t("web.moderation.rule")}</legend>
              <RuleSelect value={rule} onChange={setRule} />
            </fieldset>
          )}
          <Field label={t("web.moderation.note", { optional: t("web.common.optional") })}>
            {({ id }) => (
              <Input id={id} value={note} onChange={(event) => setNote(event.target.value)} />
            )}
          </Field>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="secondary"
              isLoading={resolve.isPending}
              onClick={() => resolve.mutate({ resolution: "dismiss" })}
            >
              {t("web.moderation.dismiss")}
            </Button>
            {report.targetType === "user" ? null : (
              <Button
                variant="danger"
                disabled={!rule}
                isLoading={resolve.isPending}
                onClick={() => resolve.mutate({ resolution: "remove_content" })}
              >
                {t("web.moderation.removeContent")}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  )
}
