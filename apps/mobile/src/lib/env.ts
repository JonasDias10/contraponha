import { parseEnv } from "@contraponha/config"
import { z } from "zod"

const mobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.url(),
  EXPO_PUBLIC_WEB_URL: z.url(),
})

export type MobileEnv = z.output<typeof mobileEnvSchema>

export function getMobileEnv(): MobileEnv {
  // Expo only inlines EXPO_PUBLIC_* variables accessed with static member syntax.
  return parseEnv({
    schema: mobileEnvSchema,
    source: {
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_WEB_URL: process.env.EXPO_PUBLIC_WEB_URL,
    },
  })
}

export function webUrl(path: string): string {
  return new URL(path, getMobileEnv().EXPO_PUBLIC_WEB_URL).toString()
}
