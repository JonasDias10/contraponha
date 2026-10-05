import { Injectable } from "@nestjs/common"
import {
  getUniqueViolationConstraint,
  USERS_EMAIL_UNIQUE,
  USERS_HANDLE_UNIQUE,
} from "@ponto/database"
import type { DatabaseExecutor } from "@ponto/database"
import { ApiErrorCode } from "@ponto/types"

import { AppError } from "#src/common/errors/app-error.js"
import { isReservedHandle, type User } from "#src/modules/users/domain/user.js"
import {
  UsersRepository,
  type CreateUserData,
  type UpdateUserData,
} from "#src/modules/users/repositories/users.repository.js"

const ERROR_BY_CONSTRAINT: Record<string, ApiErrorCode> = {
  [USERS_EMAIL_UNIQUE]: ApiErrorCode.EMAIL_ALREADY_IN_USE,
  [USERS_HANDLE_UNIQUE]: ApiErrorCode.HANDLE_UNAVAILABLE,
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id)

    if (!user) {
      throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)
    }

    return user
  }

  async getByHandle(handle: string): Promise<User> {
    const user = await this.usersRepository.findByHandle(handle)

    if (!user) {
      throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)
    }

    return user
  }

  findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findByEmail(email)
  }

  async create({
    data,
    executor,
  }: {
    data: CreateUserData
    executor?: DatabaseExecutor
  }): Promise<User> {
    if (isReservedHandle(data.handle)) {
      throw new AppError(ApiErrorCode.HANDLE_UNAVAILABLE, { details: { field: "handle" } })
    }

    try {
      return await this.usersRepository.create({ data, executor })
    } catch (error) {
      const code = ERROR_BY_CONSTRAINT[getUniqueViolationConstraint(error) ?? ""]

      if (code) {
        throw new AppError(code, { cause: error })
      }

      throw error
    }
  }

  async updateProfile({ id, data }: { id: string; data: UpdateUserData }): Promise<User> {
    const user = await this.usersRepository.update({ id, data })

    if (!user) {
      throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)
    }

    return user
  }

  markEmailVerified({ id, executor }: { id: string; executor?: DatabaseExecutor }): Promise<void> {
    return this.usersRepository.markEmailVerified({ id, executor })
  }
}
