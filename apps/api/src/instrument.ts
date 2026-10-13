import { sentryOptions } from "@contraponha/config"
import * as Sentry from "@sentry/nestjs"

// Loaded with `node --import` before the app, so Sentry can instrument http, express and pg
// as they are imported. Without SENTRY_DSN nothing is sent (local development and tests).
Sentry.init({
  ...sentryOptions({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE,
  }),
  // Every logger.error (request failures, background jobs, email, push) becomes an event.
  integrations: [
    Sentry.pinoIntegration({ error: { levels: ["error", "fatal"] }, log: { levels: [] } }),
  ],
})
