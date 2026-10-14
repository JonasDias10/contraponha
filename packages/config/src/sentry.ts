export interface SentryOptionsParams {
  dsn: string | undefined
  environment: string | undefined
  release?: string
  tracesSampleRate?: string
}

export interface SentryHeaderAllowList {
  allow: string[]
}

export interface SentryDataCollection {
  userInfo: false
  cookies: false
  httpHeaders: { request: SentryHeaderAllowList }
  httpBodies: []
}

export interface SentryBaseOptions {
  dsn: string | undefined
  enabled: boolean
  environment: string | undefined
  release: string | undefined
  tracesSampleRate: number
  dataCollection: SentryDataCollection
}

const DEFAULT_TRACES_SAMPLE_RATE = 0.1

// Shared by the API, web, hub and mobile: nothing is sent without a DSN, and no user
// details, cookies or request bodies (passwords, posts) ever leave the app.
export function sentryOptions({
  dsn,
  environment,
  release,
  tracesSampleRate,
}: SentryOptionsParams): SentryBaseOptions {
  const rate = Number(tracesSampleRate)

  return {
    dsn,
    enabled: Boolean(dsn),
    environment,
    release,
    tracesSampleRate: Number.isFinite(rate) && tracesSampleRate ? rate : DEFAULT_TRACES_SAMPLE_RATE,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: ["user-agent", "accept-language", "content-type"] } },
      httpBodies: [],
    },
  }
}
