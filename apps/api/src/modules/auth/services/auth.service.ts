import { Inject, Injectable } from "@nestjs/common"
import { runTransaction, type Database, type DatabaseExecutor } from "@contraponha/database"
import { negotiateLocale } from "@contraponha/i18n"
import { ApiErrorCode, type AuthResponse } from "@contraponha/types"
import type {
  changePasswordInputSchema,
  loginInputSchema,
  registerInputSchema,
} from "@contraponha/validation"
import type { z } from "zod"

import type { AuthContext } from "#src/common/auth/auth-context.js"
import { AppError } from "#src/common/errors/app-error.js"
import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { PasswordHasher } from "#src/modules/auth/infrastructure/password-hasher.js"
import { CredentialsRepository } from "#src/modules/auth/repositories/credentials.repository.js"
import { toPrivateProfile, type User } from "#src/modules/users/domain/user.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

import { VerificationTokensRepository } from "#src/modules/auth/repositories/verification-tokens.repository.js"

import { AccountVerificationService } from "./account-verification.service.js"
import { SessionsService } from "./sessions.service.js"

export interface ClientInfo {
  userAgent: string | undefined
  acceptLanguage: string | undefined
}

interface StartSessionParams {
  user: User
  userAgent: string | undefined
}

export interface ChangePasswordParams {
  auth: AuthContext
  input: z.output<typeof changePasswordInputSchema>
}

export interface LoginParams {
  input: z.output<typeof loginInputSchema>
  userAgent: string | undefined
}

export interface ForgetCredentialsParams {
  userId: string
  executor: DatabaseExecutor
}

export interface RegisterParams {
  input: z.output<typeof registerInputSchema>
  client: ClientInfo
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DATABASE) private readonly db: Database,
    private readonly usersService: UsersService,
    private readonly credentials: CredentialsRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionsService: SessionsService,
    private readonly accountVerification: AccountVerificationService,
    private readonly verificationTokens: VerificationTokensRepository,
  ) {}

  async register({ input, client }: RegisterParams): Promise<AuthResponse> {
    const passwordHash = await this.passwordHasher.hash(input.password)

    const locale =
      input.locale ??
      negotiateLocale({
        acceptLanguage: client.acceptLanguage,
        supported: this.config.i18n.supportedLocales,
        fallback: this.config.i18n.defaultLocale,
      })

    const user = await runTransaction({
      db: this.db,
      work: async (tx) => {
        const created = await this.usersService.create({
          data: {
            email: input.email,
            handle: input.handle,
            displayName: input.displayName,
            birthDate: input.birthDate,
            locale,
          },
          executor: tx,
        })

        await this.usersService.recordLegalConsents({ userId: created.id, executor: tx })

        await this.credentials.upsertPasswordHash({
          userId: created.id,
          passwordHash,
          executor: tx,
        })

        return created
      },
    })

    await this.accountVerification.sendEmailVerification(user)

    return this.startSession({ user, userAgent: client.userAgent })
  }

  async login({ input, userAgent }: LoginParams): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(input.email)
    const passwordHash = user ? await this.credentials.findPasswordHash(user.id) : undefined

    const isValid = passwordHash
      ? await this.passwordHasher.verify({ passwordHash, password: input.password })
      : await this.passwordHasher.verifyAgainstDecoy(input.password)

    if (!user || !isValid) throw new AppError(ApiErrorCode.INVALID_CREDENTIALS)

    return this.startSession({ user, userAgent })
  }

  // Account deletion: ends every session and erases the password and pending tokens.
  // Returns the revoked session token hashes, evicted from the cache after commit.
  async forgetCredentials({ userId, executor }: ForgetCredentialsParams): Promise<string[]> {
    const revoked = await this.sessionsService.revokeAll({ userId, executor })

    await this.credentials.deleteForUser({ userId, executor })

    await this.verificationTokens.deleteForUser({ userId, executor })

    return revoked
  }

  async changePassword({ auth, input }: ChangePasswordParams): Promise<void> {
    const currentHash = await this.credentials.findPasswordHash(auth.userId)

    const isValid = currentHash
      ? await this.passwordHasher.verify({
          passwordHash: currentHash,
          password: input.currentPassword,
        })
      : false

    if (!isValid) throw new AppError(ApiErrorCode.INVALID_CREDENTIALS)

    const newPasswordHash = await this.passwordHasher.hash(input.newPassword)

    await this.credentials.upsertPasswordHash({
      userId: auth.userId,
      passwordHash: newPasswordHash,
    })

    await this.sessionsService.revokeOthers(auth)
  }

  // Signing in during the 30-day grace period cancels a scheduled account deletion.
  private async startSession({ user, userAgent }: StartSessionParams): Promise<AuthResponse> {
    const active = user.deletionScheduledAt
      ? await this.usersService.scheduleDeletion({
          id: user.id,
          scheduledFor: null,
          deleteContributions: false,
        })
      : user

    const session = await this.sessionsService.issue({ userId: active.id, userAgent })
    return { user: toPrivateProfile(active), session }
  }
}
