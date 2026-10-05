import { parseEnv, type EnvSource } from "@ponto/config"
import type { Locale } from "@ponto/i18n"

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
}

export function loadAppConfig(source: EnvSource): AppConfig {
  const env = parseEnv(envSchema, source)
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
      ttlMs: env.RATE_LIMIT_TTL_SECONDS * 1000,
      limit: env.RATE_LIMIT_MAX_REQUESTS,
    },
    i18n: {
      defaultLocale: env.DEFAULT_LOCALE,
      supportedLocales: env.SUPPORTED_LOCALES,
    },
    swagger: {
      enabled: env.SWAGGER_ENABLED ?? !isProduction,
    },
  }
}
