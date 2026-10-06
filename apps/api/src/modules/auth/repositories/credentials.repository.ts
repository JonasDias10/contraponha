import { Inject, Injectable } from "@nestjs/common"
import { passwordCredentials, type Database, type DatabaseExecutor } from "@ponto/database"
import { eq } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface UpsertPasswordHashParams {
  userId: string
  passwordHash: string
  executor?: DatabaseExecutor
}

export interface DeleteCredentialsParams {
  userId: string
  executor: DatabaseExecutor
}

@Injectable()
export class CredentialsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findPasswordHash(userId: string): Promise<string | undefined> {
    const [credential] = await this.db
      .select({ passwordHash: passwordCredentials.passwordHash })
      .from(passwordCredentials)
      .where(eq(passwordCredentials.userId, userId))

    return credential?.passwordHash
  }

  async deleteForUser({ userId, executor }: DeleteCredentialsParams): Promise<void> {
    await executor.delete(passwordCredentials).where(eq(passwordCredentials.userId, userId))
  }

  async upsertPasswordHash({
    userId,
    passwordHash,
    executor = this.db,
  }: UpsertPasswordHashParams): Promise<void> {
    await executor
      .insert(passwordCredentials)
      .values({ userId, passwordHash })
      .onConflictDoUpdate({ target: passwordCredentials.userId, set: { passwordHash } })
  }
}
