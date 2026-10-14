import { Inject, Injectable } from "@nestjs/common"
import {
  twoFactorRecoveryCodes,
  twoFactorSecrets,
  type Database,
  type DatabaseExecutor,
  type TwoFactorSecretRow,
} from "@contraponha/database"
import { and, count, eq, isNull, lt, or } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface SaveSetupParams {
  userId: string
  secretCiphertext: string
}

export interface EnableParams {
  userId: string
  step: number
  codeHashes: readonly string[]
  executor: DatabaseExecutor
}

export interface MarkStepParams {
  userId: string
  step: number
}

export interface ReplaceCodesParams {
  userId: string
  codeHashes: readonly string[]
  executor: DatabaseExecutor
}

export interface UseRecoveryCodeParams {
  userId: string
  codeHash: string
}

export interface DeleteForUserParams {
  userId: string
  executor: DatabaseExecutor
}

@Injectable()
export class TwoFactorRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async find(userId: string): Promise<TwoFactorSecretRow | undefined> {
    const [row] = await this.db
      .select()
      .from(twoFactorSecrets)
      .where(eq(twoFactorSecrets.userId, userId))

    return row
  }

  async saveSetup({ userId, secretCiphertext }: SaveSetupParams): Promise<void> {
    await this.db
      .insert(twoFactorSecrets)
      .values({ userId, secretCiphertext })
      .onConflictDoUpdate({
        target: twoFactorSecrets.userId,
        set: { secretCiphertext, enabledAt: null, lastUsedStep: null },
      })
  }

  async enable({ userId, step, codeHashes, executor }: EnableParams): Promise<void> {
    await executor
      .update(twoFactorSecrets)
      .set({ enabledAt: new Date(), lastUsedStep: step })
      .where(eq(twoFactorSecrets.userId, userId))

    await this.replaceCodes({ userId, codeHashes, executor })
  }

  // Accepts the time step only once: a code seen in this or a later step is refused.
  async markStepUsed({ userId, step }: MarkStepParams): Promise<boolean> {
    const updated = await this.db
      .update(twoFactorSecrets)
      .set({ lastUsedStep: step })
      .where(
        and(
          eq(twoFactorSecrets.userId, userId),
          or(isNull(twoFactorSecrets.lastUsedStep), lt(twoFactorSecrets.lastUsedStep, step)),
        ),
      )
      .returning({ lastUsedStep: twoFactorSecrets.lastUsedStep })

    return updated.length > 0
  }

  async replaceCodes({ userId, codeHashes, executor }: ReplaceCodesParams): Promise<void> {
    await executor.delete(twoFactorRecoveryCodes).where(eq(twoFactorRecoveryCodes.userId, userId))

    await executor
      .insert(twoFactorRecoveryCodes)
      .values(codeHashes.map((codeHash) => ({ userId, codeHash })))
  }

  async useRecoveryCode({ userId, codeHash }: UseRecoveryCodeParams): Promise<boolean> {
    const used = await this.db
      .update(twoFactorRecoveryCodes)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(twoFactorRecoveryCodes.userId, userId),
          eq(twoFactorRecoveryCodes.codeHash, codeHash),
          isNull(twoFactorRecoveryCodes.usedAt),
        ),
      )
      .returning({ id: twoFactorRecoveryCodes.id })

    return used.length > 0
  }

  async countUnusedCodes(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(twoFactorRecoveryCodes)
      .where(and(eq(twoFactorRecoveryCodes.userId, userId), isNull(twoFactorRecoveryCodes.usedAt)))

    return row?.total ?? 0
  }

  async deleteForUser({ userId, executor }: DeleteForUserParams): Promise<void> {
    await executor.delete(twoFactorRecoveryCodes).where(eq(twoFactorRecoveryCodes.userId, userId))

    await executor.delete(twoFactorSecrets).where(eq(twoFactorSecrets.userId, userId))
  }
}
