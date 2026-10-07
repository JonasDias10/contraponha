import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native"

import { Screen, ScreenHeader, ScrollContent } from "@/components/ui/screen"

export interface SettingsScreenProps {
  title: string
  children: React.ReactNode
}

export function SettingsScreen({ title, children }: SettingsScreenProps): React.JSX.Element {
  return (
    <Screen>
      <ScreenHeader title={title} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <ScrollContent>{children}</ScrollContent>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
