import { withSentryConfig } from "@sentry/nextjs/config"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
}

// Source maps are uploaded only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set
// (in the deploy pipeline); local and CI builds skip it.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
})
