import { createHash } from "node:crypto"

import { daysToMs, parseEnv, secondsToMs, type EnvSource } from "@contraponha/config"
import type { Locale } from "@contraponha/i18n"

import { envSchema, type Env } from "./env.schema.js"

export const APP_CONFIG = Symbol("APP_CONFIG")

export interface AppConfig {
  nodeEnv: Env["NODE_ENV"]
  isProduction: boolean
  http: {
    host: string
    port: number
    trustProxy: number
    corsOrigins: string[]
  }
  log: {
    level: Env["LOG_LEVEL"]
    pretty: boolean
  }
  database: {
    url: string
    poolMax: number
  }
  redis: {
    url: string
  }
  rateLimit: {
    ttlMs: number
    limit: number
  }
  i18n: {
    defaultLocale: Locale
    supportedLocales: Locale[]
  }
  swagger: {
    enabled: boolean
  }
  webAppUrl: string
  auth: {
    sessionTtlMs: number
    rateLimit: {
      ttlMs: number
      limit: number
    }
  }
  storage: {
    endpoint: string | undefined
    region: string
    bucket: string
    accessKeyId: string
    secretAccessKey: string
    forcePathStyle: boolean
    autoCreateBucket: boolean
  }
  media: {
    publicBaseUrl: string
  }
  backgroundJobs: {
    enabled: boolean
  }
  writeLimits: {
    multiplier: number
  }
  humanCheck: {
    turnstileSecretKey: string | undefined
  }
  twoFactor: {
    encryptionKey: Buffer
  }
  push: {
    enabled: boolean
    expoAccessToken: string | undefined
  }
  email: {
    from: string
    smtp: {
      host: string
      port: number
      secure: boolean
      user: string | undefined
      password: string | undefined
    }
  }
}

interface TwoFactorKeyParams {
  value: string | undefined
  isProduction: boolean
}

// Development and tests get a fixed key so no setup is needed; production must set its own.
function twoFactorKey({ value, isProduction }: TwoFactorKeyParams): Buffer {
  if (value) return Buffer.from(value, "base64")

  if (isProduction) throw new Error("TWO_FACTOR_ENCRYPTION_KEY is required in production")

  return createHash("sha256").update("contraponha-development-two-factor-key").digest()
}

export function loadAppConfig(source: EnvSource): AppConfig {
  const env = parseEnv({ schema: envSchema, source })
  const isProduction = env.NODE_ENV === "production"

  return {
    nodeEnv: env.NODE_ENV,
    isProduction,
    http: {
      host: env.HOST,
      port: env.PORT,
      trustProxy: env.TRUST_PROXY,
      corsOrigins: env.CORS_ORIGINS,
    },
    log: {
      level: env.LOG_LEVEL,
      pretty: env.NODE_ENV === "development",
    },
    database: {
      url: env.DATABASE_URL,
      poolMax: env.DATABASE_POOL_MAX,
    },
    redis: {
      url: env.REDIS_URL,
    },
    rateLimit: {
      ttlMs: secondsToMs(env.RATE_LIMIT_TTL_SECONDS),
      limit: env.RATE_LIMIT_MAX_REQUESTS,
    },
    i18n: {
      defaultLocale: env.DEFAULT_LOCALE,
      supportedLocales: env.SUPPORTED_LOCALES,
    },
    swagger: {
      enabled: env.SWAGGER_ENABLED ?? !isProduction,
    },
    webAppUrl: env.WEB_APP_URL.replace(/\/+$/, ""),
    auth: {
      sessionTtlMs: daysToMs(env.SESSION_TTL_DAYS),
      rateLimit: {
        ttlMs: secondsToMs(env.AUTH_RATE_LIMIT_TTL_SECONDS),
        limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
      },
    },
    storage: {
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      bucket: env.STORAGE_BUCKET,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
      autoCreateBucket: env.STORAGE_AUTO_CREATE_BUCKET && !isProduction,
    },
    media: {
      publicBaseUrl: env.MEDIA_PUBLIC_BASE_URL.replace(/\/+$/, ""),
    },
    backgroundJobs: {
      enabled: env.BACKGROUND_JOBS_ENABLED,
    },
    writeLimits: {
      multiplier: env.WRITE_LIMIT_MULTIPLIER,
    },
    humanCheck: {
      turnstileSecretKey: env.TURNSTILE_SECRET_KEY,
    },
    twoFactor: {
      encryptionKey: twoFactorKey({ value: env.TWO_FACTOR_ENCRYPTION_KEY, isProduction }),
    },
    push: {
      enabled: env.PUSH_ENABLED,
      expoAccessToken: env.EXPO_ACCESS_TOKEN,
    },
    email: {
      from: env.EMAIL_FROM,
      smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
      },
    },
  }
}
