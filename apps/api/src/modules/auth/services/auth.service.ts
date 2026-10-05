import { Inject, Injectable } from "@nestjs/common"
import type { Database } from "@ponto/database"
import { negotiateLocale } from "@ponto/i18n"
import { ApiErrorCode, type AuthResponse } from "@ponto/types"
import type {
  changePasswordInputSchema,
  loginInputSchema,
  registerInputSchema,
} from "@ponto/validation"
import type { z } from "zod"

import type { AuthContext } from "#src/common/auth/auth-context.js"
import { AppError } from "#src/common/errors/app-error.js"
import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { PasswordHasher } from "#src/modules/auth/infrastructure/password-hasher.js"
import { CredentialsRepository } from "#src/modules/auth/repositories/credentials.repository.js"
import { toPrivateProfile, type User } from "#src/modules/users/domain/user.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

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

    const user = await this.db.transaction(async (tx) => {
      const created = await this.usersService.create({
        data: { email: input.email, handle: input.handle, displayName: input.displayName, locale },
        executor: tx,
      })
      await this.credentials.upsertPasswordHash({
        userId: created.id,
        passwordHash,
        executor: tx,
      })
      return created
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

    if (!user || !isValid) {
      throw new AppError(ApiErrorCode.INVALID_CREDENTIALS)
    }

    return this.startSession({ user, userAgent })
  }

  async changePassword({ auth, input }: ChangePasswordParams): Promise<void> {
    const currentHash = await this.credentials.findPasswordHash(auth.userId)
    const isValid = currentHash
      ? await this.passwordHasher.verify({
          passwordHash: currentHash,
          password: input.currentPassword,
        })
      : false

    if (!isValid) {
      throw new AppError(ApiErrorCode.INVALID_CREDENTIALS)
    }

    const newPasswordHash = await this.passwordHasher.hash(input.newPassword)
    await this.credentials.upsertPasswordHash({
      userId: auth.userId,
      passwordHash: newPasswordHash,
    })
    await this.sessionsService.revokeOthers(auth)
  }

  private async startSession({ user, userAgent }: StartSessionParams): Promise<AuthResponse> {
    const session = await this.sessionsService.issue({ userId: user.id, userAgent })
    return { user: toPrivateProfile(user), session }
  }
}
