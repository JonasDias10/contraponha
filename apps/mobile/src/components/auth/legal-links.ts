import * as WebBrowser from "expo-web-browser"

import { webUrl } from "@/lib/env"

export type LegalPage = "terms" | "privacy" | "guidelines" | "about" | "transparency"

export function openLegalPage(page: LegalPage): void {
  void WebBrowser.openBrowserAsync(webUrl(`/${page}`))
}
