import { setTimeout as sleep } from "node:timers/promises"

import type { Database, DatabaseTransaction } from "./client.js"
import { isRetryableTransactionError } from "./errors.js"

const DEFAULT_MAX_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 10

export interface RunTransactionParams<TResult> {
  db: Pick<Database, "transaction">
  work: (tx: DatabaseTransaction) => Promise<TResult>
  maxAttempts?: number
}

// Deadlocks (40P01) and serialization failures (40001) abort the whole transaction,
// so the safe recovery is to run it again from the start after a short, jittered pause.
export async function runTransaction<TResult>({
  db,
  work,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}: RunTransactionParams<TResult>): Promise<TResult> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await db.transaction(work)
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryableTransactionError(error)) throw error

      await sleep(RETRY_BASE_DELAY_MS * attempt + Math.random() * RETRY_BASE_DELAY_MS)
    }
  }
}
