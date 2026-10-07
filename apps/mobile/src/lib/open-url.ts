import * as WebBrowser from "expo-web-browser"
import { Linking } from "react-native"

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"])

// Links come from people's posts; only web and mail links are ever opened.
export function openExternalUrl(url: string): void {
  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return
  }

  if (!SAFE_PROTOCOLS.has(parsed.protocol)) return

  if (parsed.protocol === "mailto:") {
    void Linking.openURL(url)

    return
  }

  void WebBrowser.openBrowserAsync(url)
}
