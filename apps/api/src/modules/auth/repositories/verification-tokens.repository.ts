import { Inject, Injectable } from "@nestjs/common"
import {
  verificationTokens,
  type Database,
  type DatabaseExecutor,
  type VerificationTokenPurpose,
} from "@ponto/database"
import { and, eq, gt, isNull } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface IssueVerificationTokenData {
  userId: string
  purpose: VerificationTokenPurpose
  tokenHash: string
  expiresAt: Date
}

export interface ConsumeVerificationTokenParams {
  tokenHash: string
  purpose: VerificationTokenPurpose
  executor?: DatabaseExecutor
}

export interface ReplaceVerificationTokenParams {
  data: IssueVerificationTokenData
  executor?: DatabaseExecutor
}

export interface DeleteUserTokensParams {
  userId: string
  executor: DatabaseExecutor
}

@Injectable()
export class VerificationTokensRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async replace({ data, executor = this.db }: ReplaceVerificationTokenParams): Promise<void> {
    await executor
      .update(verificationTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(verificationTokens.userId, data.userId),
          eq(verificationTokens.purpose, data.purpose),
          isNull(verificationTokens.consumedAt),
        ),
      )

    await executor.insert(verificationTokens).values(data)
  }

  async consume({
    tokenHash,
    purpose,
    executor = this.db,
  }: ConsumeVerificationTokenParams): Promise<string | undefined> {
    const now = new Date()

    const [token] = await executor
      .update(verificationTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(verificationTokens.tokenHash, tokenHash),
          eq(verificationTokens.purpose, purpose),
          isNull(verificationTokens.consumedAt),
          gt(verificationTokens.expiresAt, now),
        ),
      )
      .returning({ userId: verificationTokens.userId })

    return token?.userId
  }

  async deleteForUser({ userId, executor }: DeleteUserTokensParams): Promise<void> {
    await executor.delete(verificationTokens).where(eq(verificationTokens.userId, userId))
  }
}
