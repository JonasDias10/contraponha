import { queryKeys } from "@contraponha/client-core"
import { useResolveReportMutation } from "@contraponha/client-core/react"
import { ReportStatus, type CommunityRule, type ReportView } from "@contraponha/types"
import { router } from "expo-router"
import { Inbox } from "lucide-react-native"
import { useState } from "react"
import { StyleSheet, View } from "react-native"

import { InfiniteList } from "@/components/feed/infinite-list"
import { RelativeTime } from "@/components/post/relative-time"
import { RuleSelect } from "@/components/post/rule-select"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Screen, ScreenHeader } from "@/components/ui/screen"
import { Segmented } from "@/components/ui/segmented"
import { Card, Divider, EmptyState } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { TextField } from "@/components/ui/text-field"
import { TextLink } from "@/components/ui/text-link"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { paths } from "@/lib/paths"
import { radius, space } from "@/lib/theme"

interface ReportCardProps {
  report: ReportView
}

function ReportCard({ report }: ReportCardProps): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()
  const resolve = useResolveReportMutation()
  const [rule, setRule] = useState<CommunityRule>()
  const [note, setNote] = useState("")

  const target =
    report.targetType === "post"
      ? paths.post(report.targetId)
      : report.targetType === "user" && report.targetAuthor
        ? paths.profile(report.targetAuthor.handle)
        : null

  return (
    <Card style={styles.card}>
      <View style={styles.chips}>
        <Chip label={t(`web.moderation.target_${report.targetType}`)} />
        <Chip tone="warning" label={t(`web.report.${report.reason}`)} />
      </View>
      <View style={styles.meta}>
        <AppText variant="caption" tone="subtle">
          {t("web.moderation.reportedBy", {
            name: report.reporter?.displayName ?? t("web.common.deletedAccount"),
          })}{" "}
          ·{" "}
        </AppText>
        <RelativeTime value={report.createdAt} variant="caption" tone="subtle" />
      </View>
      {report.excerpt ? (
        <View style={[styles.excerpt, { backgroundColor: palette.surfaceSunken }]}>
          <AppText variant="reading">“{report.excerpt}”</AppText>
        </View>
      ) : null}
      {report.targetAuthor ? (
        <AppText variant="small" tone="muted">
          {report.targetAuthor.displayName} · @{report.targetAuthor.handle}
        </AppText>
      ) : null}
      {report.details ? <AppText variant="small">{report.details}</AppText> : null}
      {target ? (
        <TextLink variant="smallStrong" href={target}>
          {t("web.moderation.openTarget")}
        </TextLink>
      ) : null}
      {report.status === "open" ? (
        <View style={styles.resolve}>
          <Divider />
          {report.targetType === "user" ? null : (
            <>
              <AppText variant="smallStrong">{t("web.moderation.rule")}</AppText>
              <RuleSelect value={rule} onChange={setRule} />
            </>
          )}
          <TextField
            label={t("web.moderation.note", { optional: t("web.common.optional") })}
            value={note}
            onChangeText={setNote}
          />
          <View style={styles.actions}>
            <Button
              variant="secondary"
              label={t("web.moderation.dismiss")}
              isLoading={resolve.isPending}
              onPress={() =>
                resolve.mutate({ reportId: report.id, resolution: "dismiss", rule, note })
              }
            />
            {report.targetType === "user" ? null : (
              <Button
                variant="danger"
                label={t("web.moderation.removeContent")}
                disabled={!rule}
                isLoading={resolve.isPending}
                onPress={() =>
                  resolve.mutate({ reportId: report.id, resolution: "remove_content", rule, note })
                }
              />
            )}
          </View>
        </View>
      ) : null}
    </Card>
  )
}

export default function ModerationScreen(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const palette = usePalette()
  const [status, setStatus] = useState<ReportStatus>(ReportStatus.OPEN)

  return (
    <Screen>
      <ScreenHeader title={t("web.moderation.queue")} />
      <InfiniteList<ReportView>
        key={status}
        queryKey={queryKeys.reports(status)}
        load={(cursor) => api.moderation.listReports({ status, cursor })}
        renderItem={({ item }) => <ReportCard report={item} />}
        keyOf={(item) => item.id}
        isSeparated
        header={
          <View style={styles.header}>
            <Segmented
              value={status}
              onChange={setStatus}
              options={[
                { value: ReportStatus.OPEN, label: t("web.moderation.open") },
                { value: ReportStatus.RESOLVED, label: t("web.moderation.resolved") },
                { value: ReportStatus.DISMISSED, label: t("web.moderation.dismissed") },
              ]}
            />
            <TextLink variant="smallStrong" onPress={() => router.push("/moderation/actions")}>
              {t("web.moderation.actions")}
            </TextLink>
          </View>
        }
        empty={
          <Card>
            <EmptyState
              icon={<Inbox size={32} color={palette.muted} />}
              title={t("web.moderation.emptyTitle")}
              description={t("web.moderation.emptyBody")}
            />
          </Card>
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: space.md, marginBottom: space.lg },
  card: { gap: space.md, padding: space.xl },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  excerpt: { padding: space.lg, borderRadius: radius.md },
  resolve: { gap: space.md },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: space.sm },
})
