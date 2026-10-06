import { envBoolean, envList } from "@ponto/config"
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@ponto/i18n"
import { z } from "zod"

const localeSchema = z.enum(SUPPORTED_LOCALES)

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    REDIS_URL: z.url({ protocol: /^rediss?$/ }),

    CORS_ORIGINS: envList.pipe(z.array(z.url())).default([]),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
    SWAGGER_ENABLED: envBoolean.optional(),

    WEB_APP_URL: z.url({ protocol: /^https?$/ }),
    SESSION_TTL_DAYS: z.coerce.number().int().positive().max(365).default(30),
    AUTH_RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),

    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: envBoolean.default(false),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(3),

    STORAGE_ENDPOINT: z.url().optional(),
    STORAGE_REGION: z.string().min(1).default("us-east-1"),
    STORAGE_BUCKET: z.string().min(3),
    STORAGE_ACCESS_KEY_ID: z.string().min(1),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
    STORAGE_FORCE_PATH_STYLE: envBoolean.default(false),
    STORAGE_AUTO_CREATE_BUCKET: envBoolean.default(false),
    MEDIA_PUBLIC_BASE_URL: z.url({ protocol: /^https?$/ }),

    DEFAULT_LOCALE: localeSchema.default(DEFAULT_LOCALE),
    SUPPORTED_LOCALES: envList.pipe(z.array(localeSchema).min(1)).default([...SUPPORTED_LOCALES]),
  })
  .refine((env) => env.SUPPORTED_LOCALES.includes(env.DEFAULT_LOCALE), {
    path: ["DEFAULT_LOCALE"],
    message: "must be one of SUPPORTED_LOCALES",
  })

export type Env = z.output<typeof envSchema>
