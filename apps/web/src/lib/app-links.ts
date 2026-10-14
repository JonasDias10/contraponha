import { envList, parseEnv } from "@contraponha/config"
import { z } from "zod"

const MOBILE_APP_ID = "app.contraponha.mobile"

// Web paths the mobile app also opens; keep in sync with the routes in apps/mobile/src/app.
const APP_PATHS = ["/posts/*", "/u/*", "/topics/*", "/verify-email", "/reset-password"]

const appLinksEnvSchema = z.object({
  APPLE_TEAM_ID: z.string().min(1).optional(),
  ANDROID_SHA256_CERT_FINGERPRINTS: envList.default([]),
})

type AppLinksEnv = z.output<typeof appLinksEnvSchema>

function getAppLinksEnv(): AppLinksEnv {
  return parseEnv({ schema: appLinksEnvSchema, source: process.env })
}

interface AppLinkComponent {
  "/": string
}

interface AppLinkDetail {
  appIDs: string[]
  components: AppLinkComponent[]
}

interface AppleAppSiteAssociation {
  applinks: { details: AppLinkDetail[] }
}

export function appleAppSiteAssociation(): AppleAppSiteAssociation | null {
  const { APPLE_TEAM_ID } = getAppLinksEnv()

  if (!APPLE_TEAM_ID) return null

  return {
    applinks: {
      details: [
        {
          appIDs: [`${APPLE_TEAM_ID}.${MOBILE_APP_ID}`],
          components: APP_PATHS.map((path) => ({ "/": path })),
        },
      ],
    },
  }
}

interface AndroidAppTarget {
  namespace: "android_app"
  package_name: string
  sha256_cert_fingerprints: string[]
}

interface AssetLinkStatement {
  relation: string[]
  target: AndroidAppTarget
}

export function androidAssetLinks(): AssetLinkStatement[] | null {
  const { ANDROID_SHA256_CERT_FINGERPRINTS } = getAppLinksEnv()

  if (ANDROID_SHA256_CERT_FINGERPRINTS.length === 0) return null

  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: MOBILE_APP_ID,
        sha256_cert_fingerprints: ANDROID_SHA256_CERT_FINGERPRINTS,
      },
    },
  ]
}
