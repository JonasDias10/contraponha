import { daysToMs, EnvValidationError } from "@ponto/config"
import { describe, expect, it } from "vitest"

import { loadAppConfig } from "./app-config.js"

const requiredEnv = {
  DATABASE_URL: "postgres://ponto:ponto@localhost:5432/ponto",
  REDIS_URL: "redis://localhost:6379",
  WEB_APP_URL: "http://localhost:3001/",
  SMTP_HOST: "localhost",
  EMAIL_FROM: "Ponto <no-reply@ponto.test>",
}

describe("loadAppConfig", () => {
  it("applies safe defaults for development", () => {
    const config = loadAppConfig(requiredEnv)

    expect(config.nodeEnv).toBe("development")
    expect(config.http.port).toBe(3000)
    expect(config.http.corsOrigins).toEqual([])
    expect(config.i18n).toEqual({ defaultLocale: "pt-BR", supportedLocales: ["pt-BR", "en", "es"] })
    expect(config.swagger.enabled).toBe(true)
    expect(config.log.pretty).toBe(true)
    expect(config.webAppUrl).toBe("http://localhost:3001")
    expect(config.auth.sessionTtlMs).toBe(daysToMs(30))
  })

  it("disables developer conveniences in production unless explicitly enabled", () => {
    const config = loadAppConfig({ ...requiredEnv, NODE_ENV: "production" })

    expect(config.swagger.enabled).toBe(false)
    expect(config.log.pretty).toBe(false)
  })

  it("fails fast when required variables are missing", () => {
    expect(() => loadAppConfig({})).toThrow(EnvValidationError)
    expect(() => loadAppConfig({})).toThrow(/DATABASE_URL[\s\S]*REDIS_URL/)
  })

  it("rejects connection strings with the wrong protocol", () => {
    expect(() => loadAppConfig({ ...requiredEnv, REDIS_URL: "http://localhost:6379" })).toThrow(
      /REDIS_URL/,
    )
  })

  it("requires the default locale to be enabled", () => {
    expect(() =>
      loadAppConfig({ ...requiredEnv, DEFAULT_LOCALE: "es", SUPPORTED_LOCALES: "pt-BR,en" }),
    ).toThrow(/DEFAULT_LOCALE/)
    expect(() => loadAppConfig({ ...requiredEnv, SUPPORTED_LOCALES: "pt-BR,fr" })).toThrow(
      /SUPPORTED_LOCALES/,
    )
  })
})
