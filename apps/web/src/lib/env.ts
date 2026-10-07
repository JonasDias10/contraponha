import { parseEnv } from "@contraponha/config"
import { z } from "zod"

const webEnvSchema = z.object({
  API_URL: z.url(),
})

export type WebEnv = z.output<typeof webEnvSchema>

export function getWebEnv(): WebEnv {
  return parseEnv({ schema: webEnvSchema, source: process.env })
}
