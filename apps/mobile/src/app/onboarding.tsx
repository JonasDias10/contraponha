import { recognitionText } from "@contraponha/client-core"
import { ONBOARDING_TOTAL_STEPS, useOnboardingFlow } from "@contraponha/client-core/react"
import { ArrowLeft, ArrowRight } from "lucide-react-native"
import { ScrollView, StyleSheet, View } from "react-native"

import { FollowButton } from "@/components/profile/follow-button"
import { InterestsPicker } from "@/components/settings/interests-picker"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Screen } from "@/components/ui/screen"
import { Card } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { space } from "@/lib/theme"

// Finishing updates the account in the cache; the root navigator then shows the app.
export default function OnboardingScreen(): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()
  const flow = useOnboardingFlow({ onFinished: () => undefined })
  const { step } = flow

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={[styles.header, { borderBottomColor: palette.line }]}>
        <AppText variant="smallStrong" style={styles.flex}>
          {t("web.onboarding.stepOf", { step, total: ONBOARDING_TOTAL_STEPS })}
        </AppText>
        <Button
          variant="ghost"
          size="sm"
          label={t("web.onboarding.skip")}
          isLoading={flow.isFinishing}
          onPress={flow.finish}
        />
      </View>
      <View style={styles.progress}>
        {[1, 2].map((index) => (
          <View
            key={index}
            style={[styles.bar, { backgroundColor: index <= step ? palette.brand : palette.line }]}
          />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {step === 1 ? (
          <>
            <View style={styles.heading}>
              <AppText variant="heading1" accessibilityRole="header">
                {t("web.onboarding.interestsTitle")}
              </AppText>
              <AppText variant="reading" tone="muted">
                {t("web.onboarding.interestsLead")}
              </AppText>
            </View>
            <InterestsPicker topics={flow.topics} selected={flow.selected} onToggle={flow.toggle} />
          </>
        ) : (
          <>
            <View style={styles.heading}>
              <AppText variant="heading1" accessibilityRole="header">
                {t("web.onboarding.peopleTitle")}
              </AppText>
              <AppText tone="muted">{t("web.onboarding.peopleLead")}</AppText>
            </View>
            {flow.suggestions.length === 0 ? (
              <AppText tone="muted">{t("web.onboarding.peopleEmpty")}</AppText>
            ) : (
              flow.suggestions.map(({ profile, recognition }) => (
                <Card key={profile.id} style={styles.person}>
                  <View style={styles.row}>
                    <Avatar id={profile.id} name={profile.displayName} src={profile.avatarUrl} />
                    <View style={styles.flex}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {profile.displayName}
                      </AppText>
                      <AppText variant="caption" tone="subtle">
                        @{profile.handle}
                      </AppText>
                    </View>
                  </View>
                  {profile.bio ? (
                    <AppText variant="small" tone="muted">
                      {profile.bio}
                    </AppText>
                  ) : null}
                  {recognition ? (
                    <AppText variant="caption" tone="subtle">
                      {recognitionText({ recognition, t })}
                    </AppText>
                  ) : null}
                  <FollowButton handle={profile.handle} initialIsFollowing={false} size="sm" />
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.line }]}>
        {step === 2 ? (
          <Button
            variant="ghost"
            icon={ArrowLeft}
            label={t("web.common.back")}
            onPress={flow.goBack}
          />
        ) : null}
        <View style={styles.flex} />
        {step === 1 ? (
          <>
            <AppText variant="small" tone="muted">
              {t("web.onboarding.selected", { count: flow.selected.size })}
            </AppText>
            <Button
              icon={ArrowRight}
              label={t("web.common.continue")}
              disabled={!flow.canContinue}
              isLoading={flow.isSaving}
              onPress={flow.saveInterests}
            />
          </>
        ) : (
          <Button
            icon={ArrowRight}
            label={t("web.onboarding.finish")}
            isLoading={flow.isFinishing}
            onPress={flow.finish}
          />
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: space.gutter,
    paddingRight: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1 },
  progress: { flexDirection: "row" },
  bar: { flex: 1, height: 4 },
  content: { padding: space.gutter, paddingTop: space.xxl, gap: space.xxl, paddingBottom: 48 },
  heading: { gap: space.sm },
  person: { gap: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.gutter,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
