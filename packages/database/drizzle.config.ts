import { existsSync } from "node:fs"
import { resolve } from "node:path"

import { defineConfig } from "drizzle-kit"

const rootEnvFile = resolve(process.cwd(), "../../.env")

if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile)
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run drizzle-kit. Copy .env.example to .env.")
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  casing: "snake_case",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
})
