import { Injectable } from "@nestjs/common"
import { LEGAL_DOCUMENT_VERSIONS, LEGAL_DOCUMENTS } from "@contraponha/config"
import {
  getUniqueViolationConstraint,
  USERS_EMAIL_UNIQUE,
  USERS_HANDLE_UNIQUE,
} from "@contraponha/database"
import type { DatabaseExecutor } from "@contraponha/database"
import { ApiErrorCode } from "@contraponha/types"

import { AppError } from "#src/common/errors/app-error.js"
import { isDeletedUser, isReservedHandle, type User } from "#src/modules/users/domain/user.js"
import { ConsentsRepository } from "#src/modules/users/repositories/consents.repository.js"
import {
  UsersRepository,
  type CreateUserData,
  type AnonymizeParams,
  type FindByHandlesParams,
  type IncrementFollowCountsParams,
  type IncrementPostCountParams,
  type ScheduleDeletionParams,
  type UpdateUserData,
  type UpdateUserRoleParams,
} from "#src/modules/users/repositories/users.repository.js"

const ERROR_BY_CONSTRAINT: Record<string, ApiErrorCode> = {
  [USERS_EMAIL_UNIQUE]: ApiErrorCode.EMAIL_ALREADY_IN_USE,
  [USERS_HANDLE_UNIQUE]: ApiErrorCode.HANDLE_UNAVAILABLE,
}

export interface MarkEmailVerifiedParams {
  id: string
  executor?: DatabaseExecutor
}

export type AdjustFollowCountsParams = IncrementFollowCountsParams

export interface UpdateProfileParams {
  id: string
  data: UpdateUserData
  executor?: DatabaseExecutor
}

export interface CreateUserParams {
  data: CreateUserData
  executor?: DatabaseExecutor
}

export interface RecordLegalConsentsParams {
  userId: string
  executor: DatabaseExecutor
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly consentsRepository: ConsentsRepository,
  ) {}

  // Records acceptance of the current version of every legal document.
  recordLegalConsents({ userId, executor }: RecordLegalConsentsParams): Promise<void> {
    return this.consentsRepository.record({
      userId,
      accepted: LEGAL_DOCUMENTS.map((document) => ({
        document,
        version: LEGAL_DOCUMENT_VERSIONS[document],
      })),
      executor,
    })
  }

  async getById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id)

    if (!user) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return user
  }

  async getByHandle(handle: string): Promise<User> {
    const user = await this.usersRepository.findByHandle(handle)

    if (!user || isDeletedUser(user)) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return user
  }

  // Deleted accounts keep their tombstone handle, so any existing row makes it unavailable.
  async isHandleAvailable(handle: string): Promise<boolean> {
    if (isReservedHandle(handle)) return false

    const user = await this.usersRepository.findByHandle(handle)

    return !user
  }

  findByHandles(params: FindByHandlesParams): Promise<User[]> {
    return this.usersRepository.findByHandles(params)
  }

  findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findByEmail(email)
  }

  async create({ data, executor }: CreateUserParams): Promise<User> {
    if (isReservedHandle(data.handle))
      throw new AppError(ApiErrorCode.HANDLE_UNAVAILABLE, { details: { field: "handle" } })

    try {
      return await this.usersRepository.create({ data, executor })
    } catch (error) {
      const code = ERROR_BY_CONSTRAINT[getUniqueViolationConstraint(error) ?? ""]

      if (code) throw new AppError(code, { cause: error })

      throw error
    }
  }

  async updateProfile({ id, data, executor }: UpdateProfileParams): Promise<User> {
    const user = await this.usersRepository.update({ id, data, executor })

    if (!user) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return user
  }

  markEmailVerified({ id, executor }: MarkEmailVerifiedParams): Promise<void> {
    return this.usersRepository.markEmailVerified({ id, executor })
  }

  async findByIds(ids: readonly string[]): Promise<Map<string, User>> {
    const uniqueIds = [...new Set(ids)]
    const found = await this.usersRepository.findByIds(uniqueIds)
    return new Map(found.map((user) => [user.id, user]))
  }

  adjustPostCount(params: IncrementPostCountParams): Promise<void> {
    return this.usersRepository.incrementPostCount(params)
  }

  markOnboarded(id: string): Promise<User> {
    return this.updateProfile({ id, data: { onboardedAt: new Date() } })
  }

  async scheduleDeletion(params: ScheduleDeletionParams): Promise<User> {
    const user = await this.usersRepository.scheduleDeletion(params)

    if (!user) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return user
  }

  listDueForDeletion(now: Date): Promise<User[]> {
    return this.usersRepository.listDueForDeletion(now)
  }

  anonymize(params: AnonymizeParams): Promise<void> {
    return this.usersRepository.anonymize(params)
  }

  adjustFollowCounts(params: AdjustFollowCountsParams): Promise<void> {
    return this.usersRepository.incrementFollowCounts(params)
  }

  async changeRole({ id, role, executor }: UpdateUserRoleParams): Promise<void> {
    const isUpdated = await this.usersRepository.updateRole({ id, role, executor })

    if (!isUpdated) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)
  }
}
