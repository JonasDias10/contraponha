import { queryKeys } from "@contraponha/client-core"
import { useEmailConfirmation } from "@contraponha/client-core/react"
import { useQueryClient } from "@tanstack/react-query"
import { router, useLocalSearchParams } from "expo-router"
import { CircleCheck } from "lucide-react-native"
import { useEffect } from "react"
import { StyleSheet, View } from "react-native"

import { AuthScreen } from "@/components/auth/auth-screen"
import { Button } from "@/components/ui/button"
import { Banner, LoadingView } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { space } from "@/lib/theme"

export default function VerifyEmailScreen(): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()
  const queryClient = useQueryClient()
  const { token } = useLocalSearchParams<{ token?: string }>()

  const query = useEmailConfirmation(token)

  useEffect(() => {
    if (query.isSuccess) void queryClient.invalidateQueries({ queryKey: queryKeys.me })
  }, [query.isSuccess, queryClient])

  return (
    <AuthScreen title={t("web.auth.verifyTitle")}>
      {!token || query.isError ? (
        <Banner tone="danger">{t("web.auth.verifyInvalid")}</Banner>
      ) : query.isPending ? (
        <LoadingView />
      ) : (
        <View style={styles.done}>
          <View style={styles.row}>
            <CircleCheck size={20} color={palette.success} />
            <AppText tone="success">{t("web.auth.verifyDone")}</AppText>
          </View>
          <Button label={t("web.auth.goHome")} onPress={() => router.replace("/home")} />
        </View>
      )}
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  done: { gap: space.xl },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
})
