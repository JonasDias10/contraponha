import { sentryOptions } from "@contraponha/config"
import * as Sentry from "@sentry/react-native"

// Imported once at startup. Without EXPO_PUBLIC_SENTRY_DSN nothing is sent.
Sentry.init(
  sentryOptions({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment:
      process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? (__DEV__ ? "development" : "production"),
    tracesSampleRate: process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  }),
)
