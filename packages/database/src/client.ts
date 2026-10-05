import { DATABASE_CONNECTION_TIMEOUT_MS, DATABASE_STATEMENT_TIMEOUT_MS } from "@ponto/config"
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import pg from "pg"

import * as schema from "./schema/index.js"

export type Database = NodePgDatabase<typeof schema>

export type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0]

export type DatabaseExecutor = Database | DatabaseTransaction

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
  connectionTimeoutMs = DATABASE_CONNECTION_TIMEOUT_MS,
  statementTimeoutMs = DATABASE_STATEMENT_TIMEOUT_MS,
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
