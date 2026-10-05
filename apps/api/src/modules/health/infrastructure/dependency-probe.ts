import { HealthStatus, type DependencyHealth } from "@ponto/types"

export interface ProbeDependencyParams {
  check: () => Promise<unknown>
  timeoutMs: number
}

export async function probeDependency({
  check,
  timeoutMs,
}: ProbeDependencyParams): Promise<DependencyHealth> {
  const startedAt = performance.now()
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
  })

  try {
    await Promise.race([check(), timeout])
    return { status: HealthStatus.UP, latencyMs: Math.round(performance.now() - startedAt) }
  } catch {
    return { status: HealthStatus.DOWN, latencyMs: Math.round(performance.now() - startedAt) }
  } finally {
    clearTimeout(timer)
  }
}
