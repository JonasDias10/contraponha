import { parseEnv } from "@contraponha/config"
import { z } from "zod"

const hubEnvSchema = z.object({
  API_URL: z.url(),
})

export type HubEnv = z.output<typeof hubEnvSchema>

export function getHubEnv(): HubEnv {
  return parseEnv({ schema: hubEnvSchema, source: process.env })
}
