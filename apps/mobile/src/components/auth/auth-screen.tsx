import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native"

import { Logo } from "@/components/brand/logo"
import { Screen, ScreenHeader } from "@/components/ui/screen"
import { AppText } from "@/components/ui/text"
import { space } from "@/lib/theme"

export interface AuthScreenProps {
  title: string
  lead?: React.ReactNode
  canGoBack?: boolean
  children: React.ReactNode
}

export function AuthScreen({
  title,
  lead,
  canGoBack = true,
  children,
}: AuthScreenProps): React.JSX.Element {
  return (
    <Screen edges={["top", "bottom"]}>
      {canGoBack ? <ScreenHeader /> : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {canGoBack ? null : <Logo size={24} />}
          <View style={styles.heading}>
            <AppText variant="heading1" accessibilityRole="header">
              {title}
            </AppText>
            {typeof lead === "string" ? <AppText tone="muted">{lead}</AppText> : lead}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: space.gutter, paddingTop: space.xxl, gap: space.xxl, paddingBottom: 48 },
  heading: { gap: space.sm },
})
