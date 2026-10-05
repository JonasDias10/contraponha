import { describe, expect, it } from "vitest"
import { z } from "zod"

import { EnvValidationError, envBoolean, envList, parseEnv } from "./env.js"

const schema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().default(3000),
  FEATURE_ENABLED: envBoolean.default(false),
  ORIGINS: envList.default([]),
})

describe("parseEnv", () => {
  it("parses and coerces valid values", () => {
    const env = parseEnv({
      schema,
      source: {
        DATABASE_URL: "postgres://localhost:5432/ponto",
        PORT: "4000",
        FEATURE_ENABLED: "true",
        ORIGINS: "https://a.example, https://b.example,",
      },
    })

    expect(env).toEqual({
      DATABASE_URL: "postgres://localhost:5432/ponto",
      PORT: 4000,
      FEATURE_ENABLED: true,
      ORIGINS: ["https://a.example", "https://b.example"],
    })
  })

  it("treats empty strings as missing so defaults apply", () => {
    const env = parseEnv({
      schema,
      source: { DATABASE_URL: "postgres://localhost/ponto", PORT: "" },
    })

    expect(env.PORT).toBe(3000)
  })

  it("fails with a message naming every invalid variable", () => {
    const parse = (): unknown =>
      parseEnv({ schema, source: { PORT: "abc", FEATURE_ENABLED: "yes" } })

    expect(parse).toThrow(EnvValidationError)

    expect(parse).toThrow(/DATABASE_URL/)

    expect(parse).toThrow(/PORT/)

    expect(parse).toThrow(/FEATURE_ENABLED/)
  })
})
