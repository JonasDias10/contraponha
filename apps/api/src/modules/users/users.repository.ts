import { Inject, Injectable } from "@nestjs/common"
import { users, type Database, type DatabaseExecutor, type NewUserRow } from "@ponto/database"
import { eq } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { User } from "./user.js"

export type CreateUserData = Pick<NewUserRow, "email" | "handle" | "displayName" | "locale">
export type UpdateUserData = Partial<Pick<NewUserRow, "displayName" | "bio" | "locale">>

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id))
    return user
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email))
    return user
  }

  async findByHandle(handle: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.handle, handle))
    return user
  }

  async create(data: CreateUserData, executor: DatabaseExecutor = this.db): Promise<User> {
    const [user] = await executor.insert(users).values(data).returning()

    if (!user) {
      throw new Error("Insert into users returned no row")
    }

    return user
  }

  async update(id: string, data: UpdateUserData): Promise<User | undefined> {
    const [user] = await this.db.update(users).set(data).where(eq(users.id, id)).returning()
    return user
  }

  async markEmailVerified(id: string, executor: DatabaseExecutor = this.db): Promise<void> {
    await executor.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, id))
  }
}
