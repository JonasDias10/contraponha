import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import pg from "pg"

import * as schema from "./schema/index.js"

export type Database = NodePgDatabase<typeof schema>

export interface DatabaseOptions {
  url: string
  applicationName?: string
  maxConnections?: number
  connectionTimeoutMs?: number
  statementTimeoutMs?: number
  onPoolError?: (error: Error) => void
}

export interface DatabaseConnection {
  db: Database
  close: () => Promise<void>
}

export function createDatabaseConnection({
  url,
  applicationName = "ponto",
  maxConnections = 10,
  connectionTimeoutMs = 5_000,
  statementTimeoutMs = 15_000,
  onPoolError,
}: DatabaseOptions): DatabaseConnection {
  const pool = new pg.Pool({
    connectionString: url,
    application_name: applicationName,
    max: maxConnections,
    connectionTimeoutMillis: connectionTimeoutMs,
    statement_timeout: statementTimeoutMs,
  })

  pool.on("error", (error) => onPoolError?.(error))

  return {
    db: drizzle({ client: pool, schema, casing: "snake_case" }),
    close: () => pool.end(),
  }
}
