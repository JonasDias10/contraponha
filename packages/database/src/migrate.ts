import { fileURLToPath } from "node:url"

import { migrate } from "drizzle-orm/node-postgres/migrator"

import { createDatabaseConnection } from "./client.js"

export const MIGRATIONS_FOLDER = fileURLToPath(new URL("../migrations", import.meta.url))

export async function runMigrations(url: string): Promise<void> {
  const connection = createDatabaseConnection({ url, maxConnections: 1 })
  try {
    await migrate(connection.db, { migrationsFolder: MIGRATIONS_FOLDER })
  } finally {
    await connection.close()
  }
}
