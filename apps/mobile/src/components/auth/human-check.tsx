import { StyleSheet, View } from "react-native"
import { WebView, type WebViewMessageEvent } from "react-native-webview"
import { z } from "zod"

import { usePalette } from "@/hooks/use-palette"
import { getMobileEnv, webUrl } from "@/lib/env"

const messageSchema = z.object({ humanCheckToken: z.string().nullable() })

export const isHumanCheckEnabled = getMobileEnv().EXPO_PUBLIC_TURNSTILE_ENABLED

export interface HumanCheckProps {
  onToken: (token: string | null) => void
}

// Turnstile runs on the web app's /human-check page; the token comes back as a message.
export function HumanCheck({ onToken }: HumanCheckProps): React.JSX.Element | null {
  const palette = usePalette()

  if (!isHumanCheckEnabled) return null

  const handleMessage = (event: WebViewMessageEvent): void => {
    const parsed = messageSchema.safeParse(JSON.parse(event.nativeEvent.data))

    if (parsed.success) onToken(parsed.data.humanCheckToken)
  }

  return (
    <View style={[styles.frame, { backgroundColor: palette.surface }]}>
      <WebView
        source={{ uri: webUrl("/human-check") }}
        onMessage={handleMessage}
        style={styles.web}
        scrollEnabled={false}
        originWhitelist={["https://*", "http://*"]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { height: 80, overflow: "hidden" },
  web: { backgroundColor: "transparent" },
})
