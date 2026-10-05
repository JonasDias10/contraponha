import { existsSync } from "node:fs"
import { resolve } from "node:path"

import { createDatabaseConnection, ensureDatabaseExists, runMigrations } from "@ponto/database"
import { sql } from "drizzle-orm"
import type { TestProject } from "vitest/node"

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string
  }
}

function toTestDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl)
  const name = url.pathname.slice(1)
  url.pathname = name.endsWith("_test") ? `/${name}` : `/${name}_test`
  return url.toString()
}

export default async function setup(project: TestProject): Promise<void> {
  const rootEnvFile = resolve(import.meta.dirname, "../../../.env")

  if (existsSync(rootEnvFile)) {
    process.loadEnvFile(rootEnvFile)
  }

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run e2e tests")
  }

  const testDatabaseUrl = toTestDatabaseUrl(databaseUrl)
  await ensureDatabaseExists(testDatabaseUrl)
  await runMigrations(testDatabaseUrl)

  const connection = createDatabaseConnection({ url: testDatabaseUrl, maxConnections: 1 })
  try {
    await connection.db.execute(sql`truncate table users cascade`)
  } finally {
    await connection.close()
  }

  project.provide("testDatabaseUrl", testDatabaseUrl)
}
