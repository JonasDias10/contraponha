export const WriteAction = {
  POST: "post",
  COMMENT: "comment",
  REACTION: "reaction",
  REPOST: "repost",
  FOLLOW: "follow",
} as const

export type WriteAction = (typeof WriteAction)[keyof typeof WriteAction]

export const WRITE_LIMIT_WINDOW_SECONDS = 60 * 60
export const NEW_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000

interface Limit {
  regular: number
  newAccount: number
}

// Per account, per hour. Generous for people, tight for scripts; brand-new accounts, the
// usual vehicle for spam waves, get a fraction until they are a day old.
const LIMITS: Record<WriteAction, Limit> = {
  [WriteAction.POST]: { regular: 20, newAccount: 5 },
  [WriteAction.COMMENT]: { regular: 120, newAccount: 20 },
  [WriteAction.REACTION]: { regular: 600, newAccount: 100 },
  [WriteAction.REPOST]: { regular: 100, newAccount: 20 },
  [WriteAction.FOLLOW]: { regular: 200, newAccount: 50 },
}

export interface WriteLimitParams {
  action: WriteAction
  accountCreatedAt: Date
  multiplier: number
  now?: Date
}

export function writeLimitFor({
  action,
  accountCreatedAt,
  multiplier,
  now = new Date(),
}: WriteLimitParams): number {
  const isNew = now.getTime() - accountCreatedAt.getTime() < NEW_ACCOUNT_AGE_MS
  const { regular, newAccount } = LIMITS[action]

  return Math.ceil((isNew ? newAccount : regular) * multiplier)
}
