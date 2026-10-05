import { Inject, Injectable } from "@nestjs/common"
import { users, type Database, type DatabaseExecutor, type NewUserRow } from "@ponto/database"
import { eq, inArray, sql } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { User } from "#src/modules/users/domain/user.js"

export type CreateUserData = Pick<NewUserRow, "email" | "handle" | "displayName" | "locale">
export type UpdateUserData = Partial<Pick<NewUserRow, "displayName" | "bio" | "locale">>

export interface IncrementFollowCountsParams {
  followerId: string
  followeeId: string
  delta: 1 | -1
  executor?: DatabaseExecutor
}

export interface MarkEmailVerifiedParams {
  id: string
  executor?: DatabaseExecutor
}

export interface UpdateUserParams {
  id: string
  data: UpdateUserData
}

export interface CreateUserParams {
  data: CreateUserData
  executor?: DatabaseExecutor
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id))
    return user
  }

  findByIds(ids: readonly string[]): Promise<User[]> {
    if (ids.length === 0) return Promise.resolve([])

    return this.db
      .select()
      .from(users)
      .where(inArray(users.id, [...ids]))
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email))
    return user
  }

  async findByHandle(handle: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.handle, handle))
    return user
  }

  async create({ data, executor = this.db }: CreateUserParams): Promise<User> {
    const [user] = await executor.insert(users).values(data).returning()

    if (!user) throw new Error("Insert into users returned no row")

    return user
  }

  async update({ id, data }: UpdateUserParams): Promise<User | undefined> {
    const [user] = await this.db.update(users).set(data).where(eq(users.id, id)).returning()
    return user
  }

  async markEmailVerified({ id, executor = this.db }: MarkEmailVerifiedParams): Promise<void> {
    await executor.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, id))
  }

  async incrementFollowCounts({
    followerId,
    followeeId,
    delta,
    executor = this.db,
  }: IncrementFollowCountsParams): Promise<void> {
    await executor
      .update(users)
      .set({ followingCount: sql`${users.followingCount} + ${delta}` })
      .where(eq(users.id, followerId))

    await executor
      .update(users)
      .set({ followerCount: sql`${users.followerCount} + ${delta}` })
      .where(eq(users.id, followeeId))
  }
}
