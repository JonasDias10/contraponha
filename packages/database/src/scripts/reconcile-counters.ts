import { createDatabaseConnection } from "../client.js"
import { reconcileCounters } from "../maintenance/reconcile-counters.js"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) throw new Error("DATABASE_URL is required to reconcile counters")

const connection = createDatabaseConnection({ url: databaseUrl, maxConnections: 2 })

try {
  const startedAt = new Date()
  const fixedRows = await reconcileCounters({ db: connection.db })
  const report = { startedAt, finishedAt: new Date(), fixedRows }

  process.stdout.write(`${JSON.stringify(report)}\n`)
} finally {
  await connection.close()
}
