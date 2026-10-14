import { Inject, Injectable } from "@nestjs/common"
import { users, type Database, type DatabaseExecutor, type NewUserRow } from "@contraponha/database"
import type { UserRole } from "@contraponha/types"
import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { User } from "#src/modules/users/domain/user.js"

export type CreateUserData = Pick<
  NewUserRow,
  "email" | "handle" | "displayName" | "locale" | "birthDate"
>
export type UpdateUserData = Partial<
  Pick<
    NewUserRow,
    | "displayName"
    | "bio"
    | "headline"
    | "location"
    | "website"
    | "pronouns"
    | "locale"
    | "timezone"
    | "onboardedAt"
    | "avatarUrl"
    | "twoFactorEnabledAt"
    | "verificationCategory"
    | "verifiedAt"
  >
>

export interface FindByHandlesParams {
  handles: readonly string[]
  executor?: DatabaseExecutor
}

export interface IncrementPostCountParams {
  id: string
  delta: 1 | -1
  executor: DatabaseExecutor
}

export interface ScheduleDeletionParams {
  id: string
  scheduledFor: Date | null
  deleteContributions: boolean
}

export interface AnonymizeParams {
  id: string
  executor: DatabaseExecutor
}

export interface IncrementFollowCountsParams {
  followerId: string
  followeeId: string
  delta: 1 | -1
  executor?: DatabaseExecutor
}

export interface UpdateUserRoleParams {
  id: string
  role: UserRole
  executor?: DatabaseExecutor
}

export interface MarkEmailVerifiedParams {
  id: string
  executor?: DatabaseExecutor
}

export interface UpdateUserParams {
  id: string
  data: UpdateUserData
  executor?: DatabaseExecutor
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

  findByHandles({ handles, executor = this.db }: FindByHandlesParams): Promise<User[]> {
    if (handles.length === 0) return Promise.resolve([])

    return executor
      .select()
      .from(users)
      .where(and(inArray(users.handle, [...handles]), isNull(users.deletedAt)))
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

  async update({ id, data, executor = this.db }: UpdateUserParams): Promise<User | undefined> {
    const [user] = await executor.update(users).set(data).where(eq(users.id, id)).returning()
    return user
  }

  async incrementPostCount({ id, delta, executor }: IncrementPostCountParams): Promise<void> {
    await executor
      .update(users)
      .set({ postCount: sql`${users.postCount} + ${delta}` })
      .where(eq(users.id, id))
  }

  async scheduleDeletion({
    id,
    scheduledFor,
    deleteContributions,
  }: ScheduleDeletionParams): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({ deletionScheduledAt: scheduledFor, deleteContributions })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning()

    return user
  }

  listDueForDeletion(now: Date): Promise<User[]> {
    return this.db
      .select()
      .from(users)
      .where(and(lte(users.deletionScheduledAt, now), isNull(users.deletedAt)))
      .limit(50)
  }

  // Keeps the row (other people's discussions reference it) but removes everything that
  // identifies the person. The handle and email are replaced by values derived from the id.
  async anonymize({ id, executor }: AnonymizeParams): Promise<void> {
    const suffix = id.replaceAll("-", "").slice(-16)

    await executor
      .update(users)
      .set({
        email: `deleted+${suffix}@contraponha.invalid`,
        emailVerifiedAt: null,
        handle: `deleted_${suffix}`,
        displayName: "",
        bio: null,
        headline: null,
        location: null,
        website: null,
        pronouns: null,
        avatarUrl: null,
        birthDate: null,
        role: "member",
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        deletionScheduledAt: null,
        deletedAt: new Date(),
      })
      .where(eq(users.id, id))
  }

  async markEmailVerified({ id, executor = this.db }: MarkEmailVerifiedParams): Promise<void> {
    await executor.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, id))
  }

  // Rows are always updated in id order: two people following each other at the same time
  // would otherwise lock the same pair of rows in opposite order and deadlock.
  async incrementFollowCounts({
    followerId,
    followeeId,
    delta,
    executor = this.db,
  }: IncrementFollowCountsParams): Promise<void> {
    const updates = [
      { id: followerId, set: { followingCount: sql`${users.followingCount} + ${delta}` } },
      { id: followeeId, set: { followerCount: sql`${users.followerCount} + ${delta}` } },
    ].toSorted((first, second) => (first.id < second.id ? -1 : 1))

    for (const update of updates)
      await executor.update(users).set(update.set).where(eq(users.id, update.id))
  }

  async updateRole({ id, role, executor = this.db }: UpdateUserRoleParams): Promise<boolean> {
    const updated = await executor
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning({ id: users.id })

    return updated.length > 0
  }
}
