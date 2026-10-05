import { z } from "zod"

export type EnvSource = Record<string, string | undefined>

export class EnvValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid environment configuration:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`)
    this.name = "EnvValidationError"
  }
}

export function parseEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  source: EnvSource,
): z.output<TSchema> {
  const normalized = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value === "" ? undefined : value]),
  )
  const result = schema.safeParse(normalized)

  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
    )
  }

  return result.data
}

export const envBoolean = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1")

export const envList = z.string().transform((value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0),
)
