import { Inject, Injectable } from "@nestjs/common"
import { passwordCredentials, type Database, type DatabaseExecutor } from "@ponto/database"
import { eq } from "drizzle-orm"

import { DATABASE } from "../../infrastructure/database/database.module.js"

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

  async upsertPasswordHash(
    userId: string,
    passwordHash: string,
    executor: DatabaseExecutor = this.db,
  ): Promise<void> {
    await executor
      .insert(passwordCredentials)
      .values({ userId, passwordHash })
      .onConflictDoUpdate({ target: passwordCredentials.userId, set: { passwordHash } })
  }
}
