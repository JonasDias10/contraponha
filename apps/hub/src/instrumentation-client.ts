import { sentryOptions } from "@contraponha/config"
import * as Sentry from "@sentry/nextjs"

Sentry.init(
  sentryOptions({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  }),
)

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
