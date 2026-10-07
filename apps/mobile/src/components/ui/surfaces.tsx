import { ActivityIndicator, StyleSheet, View, type ViewProps } from "react-native"

import { Button } from "@/components/ui/button"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { radius, space } from "@/lib/theme"

export function Card({ style, ...props }: ViewProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surfaceRaised, borderColor: palette.line },
        style,
      ]}
      {...props}
    />
  )
}

export function Divider({ style }: Pick<ViewProps, "style">): React.JSX.Element {
  const palette = usePalette()

  return (
    <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: palette.line }, style]} />
  )
}

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps): React.JSX.Element {
  return (
    <View style={styles.empty}>
      {icon}
      <AppText variant="heading3" style={styles.center}>
        {title}
      </AppText>
      {description ? (
        <AppText tone="muted" style={styles.center}>
          {description}
        </AppText>
      ) : null}
      {action}
    </View>
  )
}

export type BannerTone = "neutral" | "info" | "success" | "warning" | "danger"

export interface BannerProps {
  tone?: BannerTone
  icon?: React.ReactNode
  children: React.ReactNode
}

export function Banner({ tone = "neutral", icon, children }: BannerProps): React.JSX.Element {
  const palette = usePalette()

  const colors = {
    neutral: { background: palette.surfaceSunken, text: palette.ink },
    info: { background: palette.brandSoft, text: palette.ink },
    success: { background: palette.successSoft, text: palette.success },
    warning: { background: palette.warningSoft, text: palette.warning },
    danger: { background: palette.dangerSoft, text: palette.danger },
  }[tone]

  return (
    <View
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      style={[styles.banner, { backgroundColor: colors.background }]}
    >
      {icon}
      <View style={styles.bannerBody}>
        {typeof children === "string" ? (
          <AppText variant="small" style={{ color: colors.text }}>
            {children}
          </AppText>
        ) : (
          children
        )}
      </View>
    </View>
  )
}

export function LoadingView(): React.JSX.Element {
  const palette = usePalette()

  return (
    <View style={styles.fill}>
      <ActivityIndicator color={palette.muted} />
    </View>
  )
}

export interface ErrorViewProps {
  onRetry?: () => void
}

export function ErrorView({ onRetry }: ErrorViewProps): React.JSX.Element {
  const { t } = useI18n()

  return (
    <View style={styles.fill}>
      <EmptyState
        title={t("web.common.somethingWentWrong")}
        action={
          onRetry ? (
            <Button variant="secondary" label={t("web.common.retry")} onPress={onRetry} />
          ) : null
        }
      />
    </View>
  )
}

export function Skeleton({ style }: Pick<ViewProps, "style">): React.JSX.Element {
  const palette = usePalette()

  return (
    <View style={[{ backgroundColor: palette.surfaceSunken, borderRadius: radius.sm }, style]} />
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
  empty: { alignItems: "center", gap: space.md, paddingVertical: 48, paddingHorizontal: space.xxl },
  center: { textAlign: "center" },
  banner: {
    flexDirection: "row",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    alignItems: "flex-start",
  },
  bannerBody: { flex: 1 },
  fill: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xxl },
})
