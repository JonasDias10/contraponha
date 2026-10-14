import type { ConfigContext, ExpoConfig } from "expo/config"

const APP_PATHS = ["/posts/", "/u/", "/topics/", "/verify-email", "/reset-password"]

// Links to the public site open in the app (universal links on iOS, verified app links on
// Android). Only for an https site; the web app serves the matching .well-known files.
function siteHost(): string | null {
  const webUrl = process.env.EXPO_PUBLIC_WEB_URL

  if (!webUrl) return null

  const url = new URL(webUrl)

  return url.protocol === "https:" ? url.host : null
}

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const host = siteHost()
  const base = { ...config, name: config.name ?? "Contraponha", slug: config.slug ?? "contraponha" }

  if (!host) return base

  return {
    ...base,
    ios: { ...config.ios, associatedDomains: [`applinks:${host}`] },
    android: {
      ...config.android,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: APP_PATHS.map((pathPrefix) => ({ scheme: "https", host, pathPrefix })),
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
  }
}
