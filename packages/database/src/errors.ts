const UNIQUE_VIOLATION = "23505"
const RETRYABLE_TRANSACTION_ERRORS = new Set(["40001", "40P01"])

interface PostgresError {
  code: string
  constraint?: string
}

function findPostgresError(error: unknown): PostgresError | undefined {
  let current: unknown = error
  while (typeof current === "object" && current !== null) {
    if ("code" in current && typeof current.code === "string") return current as PostgresError

    current = "cause" in current ? current.cause : undefined
  }
  return undefined
}

export function getUniqueViolationConstraint(error: unknown): string | undefined {
  const postgresError = findPostgresError(error)
  return postgresError?.code === UNIQUE_VIOLATION ? postgresError.constraint : undefined
}

export function isRetryableTransactionError(error: unknown): boolean {
  const postgresError = findPostgresError(error)
  return postgresError !== undefined && RETRYABLE_TRANSACTION_ERRORS.has(postgresError.code)
}
