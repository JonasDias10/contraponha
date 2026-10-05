import { describe, expect, it, vi } from "vitest"

import type { DatabaseTransaction } from "./client.js"
import { runTransaction } from "./transaction.js"

function postgresError(code: string): Error {
  return Object.assign(new Error(`postgres ${code}`), { code })
}

interface FakeDatabase {
  transaction: <T>(work: (tx: DatabaseTransaction) => Promise<T>) => Promise<T>
  calls: () => number
}

function fakeDatabase(outcomes: (Error | string)[]): FakeDatabase {
  let calls = 0

  return {
    transaction: <T>(work: (tx: DatabaseTransaction) => Promise<T>): Promise<T> => {
      const outcome = outcomes[calls]

      calls += 1

      if (outcome instanceof Error) return Promise.reject(outcome)

      return work({} as DatabaseTransaction)
    },
    calls: () => calls,
  }
}

describe("runTransaction", () => {
  it("retries deadlocks and serialization failures, then succeeds", async () => {
    const db = fakeDatabase([postgresError("40P01"), postgresError("40001"), "ok"])
    const work = vi.fn(() => Promise.resolve("done"))

    await expect(runTransaction({ db, work })).resolves.toBe("done")

    expect(db.calls()).toBe(3)
  })

  it("gives up after the maximum number of attempts", async () => {
    const db = fakeDatabase([postgresError("40P01"), postgresError("40P01")])

    await expect(
      runTransaction({ db, work: () => Promise.resolve("never"), maxAttempts: 2 }),
    ).rejects.toThrow("postgres 40P01")

    expect(db.calls()).toBe(2)
  })

  it("does not retry other errors", async () => {
    const db = fakeDatabase([postgresError("23505")])

    await expect(runTransaction({ db, work: () => Promise.resolve("never") })).rejects.toThrow(
      "postgres 23505",
    )

    expect(db.calls()).toBe(1)
  })
})
