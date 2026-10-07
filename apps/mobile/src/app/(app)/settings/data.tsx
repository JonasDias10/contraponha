import { errorMessage, formatDate, formatDateTime, queryKeys } from "@contraponha/client-core"
import { DataExportSection, type DataExportFormat } from "@contraponha/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as WebBrowser from "expo-web-browser"
import { Download, Trash2 } from "lucide-react-native"
import { useState } from "react"
import { StyleSheet, View } from "react-native"

import { openLegalPage } from "@/components/auth/legal-links"
import { SettingsScreen } from "@/components/settings/settings-screen"
import { SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/choice"
import { Segmented } from "@/components/ui/segmented"
import { Sheet } from "@/components/ui/sheet"
import { Banner, Divider } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { TextField } from "@/components/ui/text-field"
import { TextLink } from "@/components/ui/text-link"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi, useRequiredViewer, useSession } from "@/providers/session-provider"
import { useToast } from "@/providers/toast-provider"
import { space } from "@/lib/theme"

const SECTION_KEYS = {
  [DataExportSection.CONTENT]: "web.settings.exportContent",
  [DataExportSection.REACTIONS]: "web.settings.exportReactions",
  [DataExportSection.CONNECTIONS]: "web.settings.exportConnections",
  [DataExportSection.ACCOUNT]: "web.settings.exportAccount",
  [DataExportSection.RECOMMENDATIONS]: "web.settings.exportRecommendations",
  [DataExportSection.REPORTS]: "web.settings.exportReports",
} as const

const DEFAULT_SECTIONS: DataExportSection[] = ["content", "reactions", "connections", "account"]

function ExportSection(): React.JSX.Element {
  const { t, locale } = useI18n()
  const api = useApi()
  const viewer = useRequiredViewer()
  const toast = useToast()
  const palette = usePalette()
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
    onSuccess: ({ url }) => void WebBrowser.openBrowserAsync(url),
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

  const exports = history.data?.exports ?? []

  return (
    <SettingsSection
      title={t("web.settings.exportTitle")}
      icon={<Download size={22} color={palette.brand} />}
    >
      {Object.values(DataExportSection).map((section) => (
        <Checkbox key={section} isChecked={sections.has(section)} onChange={() => toggle(section)}>
          <AppText variant="small">{t(SECTION_KEYS[section])}</AppText>
        </Checkbox>
      ))}
      <Segmented
        value={format}
        onChange={setFormat}
        options={[
          { value: "html", label: t("web.settings.exportFormatHtml") },
          { value: "json", label: t("web.settings.exportFormatJson") },
        ]}
      />
      <AppText variant="small" tone="muted">
        {t("web.settings.exportNotice", { email: viewer.email })}
      </AppText>
      <Button
        isBlock
        label={t("web.settings.requestExport")}
        isLoading={request.isPending}
        disabled={sections.size === 0}
        onPress={() => request.mutate()}
      />
      {exports.length > 0 ? (
        <View style={styles.history}>
          <AppText variant="smallStrong">{t("web.settings.exportHistory")}</AppText>
          {exports.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <Divider style={styles.divider} /> : null}
              <View style={styles.row}>
                <View style={styles.flex}>
                  <AppText variant="small">
                    {formatDateTime({ value: item.createdAt, locale })} ·{" "}
                    {item.format.toUpperCase()}
                  </AppText>
                  <AppText variant="caption" tone="subtle">
                    {t(`web.settings.exportStatus_${item.status}`)}
                  </AppText>
                </View>
                {item.status === "ready" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    label={t("web.settings.download")}
                    isLoading={download.isPending}
                    onPress={() => download.mutate(item.id)}
                  />
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </SettingsSection>
  )
}

function KeptSection(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const toast = useToast()
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
      {rows.map(({ title, why }) => (
        <View key={title} style={styles.kept}>
          <AppText variant="smallStrong">{title}</AppText>
          <AppText variant="small" tone="muted">
            {why}
          </AppText>
        </View>
      ))}
      <View style={styles.row}>
        <View style={[styles.flex, styles.kept]}>
          <AppText variant="smallStrong">{t("web.settings.keptSignals")}</AppText>
          <AppText variant="small" tone="muted">
            {t("web.settings.keptSignalsWhy")}
          </AppText>
        </View>
        <Button
          variant="secondary"
          size="sm"
          label={t("web.settings.reset")}
          isLoading={reset.isPending}
          onPress={() => reset.mutate()}
        />
      </View>
      <TextLink variant="smallStrong" onPress={() => openLegalPage("privacy")}>
        {t("web.settings.privacyLink")}
      </TextLink>
    </SettingsSection>
  )
}

function DeleteSection(): React.JSX.Element {
  const { t, locale } = useI18n()
  const api = useApi()
  const viewer = useRequiredViewer()
  const toast = useToast()
  const palette = usePalette()
  const { signOut } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [deleteContributions, setDeleteContributions] = useState(false)
  const [confirmHandle, setConfirmHandle] = useState("")

  const schedule = useMutation({
    mutationFn: () => api.account.scheduleDeletion({ confirmHandle, deleteContributions }),
    onSuccess: () => signOut(),
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  return (
    <SettingsSection
      title={t("web.settings.deleteTitle")}
      icon={<Trash2 size={22} color={palette.danger} />}
      tone="danger"
    >
      {viewer.deletionScheduledAt ? (
        <Banner tone="warning">
          {t("web.settings.deletionScheduled", {
            date: formatDate({ value: viewer.deletionScheduledAt, locale }),
          })}
        </Banner>
      ) : null}
      <AppText variant="small">{t("web.settings.deleteBody")}</AppText>
      <Checkbox isChecked={deleteContributions} onChange={setDeleteContributions}>
        <AppText variant="small">{t("web.settings.deleteContributions")}</AppText>
      </Checkbox>
      <Button
        variant="secondary"
        isBlock
        label={t("web.settings.deleteAction")}
        onPress={() => setIsOpen(true)}
      />
      <AppText variant="caption" tone="subtle">
        {t("web.settings.deleteConfirmHint")}
      </AppText>
      <Sheet
        isOpen={isOpen}
        title={t("web.settings.deleteDialogTitle")}
        onClose={() => setIsOpen(false)}
        footer={
          <Button
            variant="danger"
            label={t("web.settings.deleteConfirm")}
            isLoading={schedule.isPending}
            onPress={() => {
              if (confirmHandle === viewer.handle) schedule.mutate()
              else toast.error(t("web.validation.handleConfirm"))
            }}
          />
        }
      >
        <AppText tone="muted">{t("web.settings.deleteDialogBody")}</AppText>
        <TextField
          label={t("web.settings.deleteConfirmLabel", { handle: viewer.handle })}
          value={confirmHandle}
          onChangeText={(text) => setConfirmHandle(text.replace(/^@/, "").toLowerCase())}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Sheet>
    </SettingsSection>
  )
}

export default function DataSettingsScreen(): React.JSX.Element {
  const { t } = useI18n()

  return (
    <SettingsScreen title={t("web.settings.data")}>
      <AppText tone="muted">{t("web.settings.dataLead")}</AppText>
      <ExportSection />
      <KeptSection />
      <DeleteSection />
    </SettingsScreen>
  )
}

const styles = StyleSheet.create({
  history: { gap: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  flex: { flex: 1 },
  divider: { marginVertical: space.sm },
  kept: { gap: 2 },
})
