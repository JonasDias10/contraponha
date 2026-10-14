"use client"

import { DataExportSection, type DataExportFormat } from "@contraponha/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { errorMessage, formatDateTime, queryKeys } from "@contraponha/client-core"

import { signOut } from "@/actions/auth"
import {
  Button,
  Checkbox,
  ConfirmDialog,
  Field,
  Input,
  Segmented,
  SegmentedItem,
  SegmentedList,
  useApi,
  useI18n,
  useViewer,
} from "@contraponha/web-ui"
import { SettingsSection } from "@/components/settings/settings-section"

const SECTION_KEYS = {
  [DataExportSection.CONTENT]: "web.settings.exportContent",
  [DataExportSection.REACTIONS]: "web.settings.exportReactions",
  [DataExportSection.CONNECTIONS]: "web.settings.exportConnections",
  [DataExportSection.ACCOUNT]: "web.settings.exportAccount",
  [DataExportSection.RECOMMENDATIONS]: "web.settings.exportRecommendations",
  [DataExportSection.REPORTS]: "web.settings.exportReports",
} as const

const DEFAULT_SECTIONS: DataExportSection[] = ["content", "reactions", "connections", "account"]

export function DataSettings(): React.JSX.Element {
  const { t } = useI18n()

  return (
    <>
      <p className="text-muted">{t("web.settings.dataLead")}</p>
      <ExportSection />
      <KeptSection />
      <DeleteSection />
    </>
  )
}

function ExportSection(): React.JSX.Element {
  const { t, locale } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const queryClient = useQueryClient()
  const [sections, setSections] = useState(new Set<DataExportSection>(DEFAULT_SECTIONS))
  const [format, setFormat] = useState<DataExportFormat>("html")

  const history = useQuery({
    queryKey: queryKeys.dataExports,
    queryFn: () => api.account.listDataExports(),
  })

  const request = useMutation({
    mutationFn: () => api.account.requestDataExport({ format, sections: [...sections] }),
    onSuccess: () => toast.success(t("web.settings.exportRequested")),
    onError: (error) => toast.error(errorMessage({ error, t })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.dataExports }),
  })

  const download = useMutation({
    mutationFn: (exportId: string) => api.account.downloadDataExport(exportId),
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const toggle = (section: DataExportSection): void => {
    setSections((current) => {
      const next = new Set(current)

      if (next.has(section)) next.delete(section)
      else next.add(section)

      return next
    })
  }

  return (
    <SettingsSection
      title={t("web.settings.exportTitle")}
      icon={<Download aria-hidden className="size-6 text-brand" />}
    >
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {Object.values(DataExportSection).map((section) => (
          <label key={section} className="flex items-start gap-3 text-sm">
            <Checkbox checked={sections.has(section)} onCheckedChange={() => toggle(section)} />
            {t(SECTION_KEYS[section])}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Segmented
          value={format}
          onValueChange={(value) => setFormat(value === "json" ? "json" : "html")}
        >
          <SegmentedList className="w-70">
            <SegmentedItem value="html">{t("web.settings.exportFormatHtml")}</SegmentedItem>
            <SegmentedItem value="json">{t("web.settings.exportFormatJson")}</SegmentedItem>
          </SegmentedList>
        </Segmented>
        <span className="flex-1 text-sm text-muted">
          {t("web.settings.exportNotice", { email: viewer?.email ?? "" })}
        </span>
      </div>
      <div className="flex justify-end border-t border-line pt-4">
        <Button
          isLoading={request.isPending}
          disabled={sections.size === 0}
          onClick={() => request.mutate()}
        >
          {t("web.settings.requestExport")}
        </Button>
      </div>
      {(history.data?.exports.length ?? 0) > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t("web.settings.exportHistory")}</h3>
          <ul className="flex flex-col">
            {history.data?.exports.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 border-t border-line py-2.5 text-sm first:border-t-0"
              >
                <span className="flex-1">
                  {formatDateTime({ value: item.createdAt, locale })} · {item.format.toUpperCase()}
                </span>
                <span className="text-subtle">{t(`web.settings.exportStatus_${item.status}`)}</span>
                {item.status === "ready" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={download.isPending}
                    onClick={() => download.mutate(item.id)}
                  >
                    {t("web.settings.download")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SettingsSection>
  )
}

function KeptSection(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const queryClient = useQueryClient()

  const reset = useMutation({
    mutationFn: () => api.account.resetRecommendations(),
    onSuccess: () => toast.success(t("web.settings.resetDone")),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.topics.followed }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.discover }),
      ]),
  })

  const rows = [
    { title: t("web.settings.keptContent"), why: t("web.settings.keptContentWhy") },
    { title: t("web.settings.keptAccess"), why: t("web.settings.keptAccessWhy") },
  ]

  return (
    <SettingsSection title={t("web.settings.keptTitle")}>
      <ul className="flex flex-col">
        {rows.map(({ title, why }) => (
          <li key={title} className="flex flex-col border-t border-line py-3 first:border-t-0">
            <strong className="text-sm">{title}</strong>
            <span className="text-sm text-muted">{why}</span>
          </li>
        ))}
        <li className="flex items-center gap-3 border-t border-line py-3">
          <span className="flex flex-1 flex-col">
            <strong className="text-sm">{t("web.settings.keptSignals")}</strong>
            <span className="text-sm text-muted">{t("web.settings.keptSignalsWhy")}</span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            isLoading={reset.isPending}
            onClick={() => reset.mutate()}
          >
            {t("web.settings.reset")}
          </Button>
        </li>
      </ul>
      <Link href="/privacy" className="text-sm font-semibold text-brand">
        {t("web.settings.privacyLink")}
      </Link>
    </SettingsSection>
  )
}

function DeleteSection(): React.JSX.Element | null {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const [isOpen, setIsOpen] = useState(false)
  const [deleteContributions, setDeleteContributions] = useState(false)
  const [confirmHandle, setConfirmHandle] = useState("")

  const schedule = useMutation({
    mutationFn: () => api.account.scheduleDeletion({ confirmHandle, deleteContributions }),
    onSuccess: () => signOut(),
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  if (!viewer) return null

  return (
    <SettingsSection
      title={t("web.settings.deleteTitle")}
      icon={<Trash2 aria-hidden className="size-6 text-danger" />}
      tone="danger"
    >
      <p>{t("web.settings.deleteBody")}</p>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox
          checked={deleteContributions}
          onCheckedChange={(checked) => setDeleteContributions(checked === true)}
        />
        {t("web.settings.deleteContributions")}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="dangerOutline" onClick={() => setIsOpen(true)}>
          {t("web.settings.deleteAction")}
        </Button>
        <span className="text-[13px] text-subtle">{t("web.settings.deleteConfirmHint")}</span>
      </div>
      <ConfirmDialog
        cancelLabel={t("web.common.cancel")}
        closeLabel={t("web.common.close")}
        open={isOpen}
        onOpenChange={setIsOpen}
        title={t("web.settings.deleteDialogTitle")}
        description={t("web.settings.deleteDialogBody")}
        confirmLabel={t("web.settings.deleteConfirm")}
        isPending={schedule.isPending}
        onConfirm={() => {
          if (confirmHandle === viewer.handle) schedule.mutate()
          else toast.error(t("web.validation.handleConfirm"))
        }}
      >
        <Field label={t("web.settings.deleteConfirmLabel", { handle: viewer.handle })}>
          {({ id }) => (
            <Input
              id={id}
              autoComplete="off"
              autoCapitalize="none"
              value={confirmHandle}
              onChange={(event) =>
                setConfirmHandle(event.target.value.replace(/^@/, "").toLowerCase())
              }
            />
          )}
        </Field>
      </ConfirmDialog>
    </SettingsSection>
  )
}
