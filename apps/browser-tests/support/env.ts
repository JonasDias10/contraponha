import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

const ROOT_ENV = fileURLToPath(new URL("../../../.env", import.meta.url))

// Locally the servers read the repository .env; the tests need the same database and
// mailbox. CI sets everything in the job environment instead.
if (existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV)

export const API_URL = process.env.BROWSER_TESTS_API_URL ?? "http://localhost:3000"
export const WEB_URL = process.env.BROWSER_TESTS_WEB_URL ?? "http://localhost:3001"
export const HUB_URL = process.env.BROWSER_TESTS_HUB_URL ?? "http://localhost:3002"
export const MAILPIT_URL = process.env.BROWSER_TESTS_MAILPIT_URL ?? "http://localhost:8025"

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL

  if (!url) throw new Error("DATABASE_URL is required to prepare browser test accounts")

  return url
}
