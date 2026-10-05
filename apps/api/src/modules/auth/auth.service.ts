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
import { toPrivateProfile, type User } from "#src/modules/users/user.js"
import { UsersService } from "#src/modules/users/users.service.js"
import { AccountVerificationService } from "./account-verification.service.js"
import { CredentialsRepository } from "./credentials.repository.js"
import { PasswordHasher } from "./password-hasher.js"
import { SessionsService } from "./sessions.service.js"

export interface ClientInfo {
  userAgent: string | undefined
  acceptLanguage: string | undefined
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

  async register(
    input: z.output<typeof registerInputSchema>,
    client: ClientInfo,
  ): Promise<AuthResponse> {
    const passwordHash = await this.passwordHasher.hash(input.password)
    const locale =
      input.locale ??
      negotiateLocale(client.acceptLanguage, {
        supported: this.config.i18n.supportedLocales,
        fallback: this.config.i18n.defaultLocale,
      })

    const user = await this.db.transaction(async (tx) => {
      const created = await this.usersService.create(
        { email: input.email, handle: input.handle, displayName: input.displayName, locale },
        tx,
      )
      await this.credentials.upsertPasswordHash(created.id, passwordHash, tx)
      return created
    })

    await this.accountVerification.sendEmailVerification(user)
    return this.startSession(user, client.userAgent)
  }

  async login(
    input: z.output<typeof loginInputSchema>,
    userAgent: string | undefined,
  ): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(input.email)
    const passwordHash = user ? await this.credentials.findPasswordHash(user.id) : undefined
    const isValid = passwordHash
      ? await this.passwordHasher.verify(passwordHash, input.password)
      : await this.passwordHasher.verifyAgainstDecoy(input.password)

    if (!user || !isValid) {
      throw new AppError(ApiErrorCode.INVALID_CREDENTIALS)
    }

    return this.startSession(user, userAgent)
  }

  async changePassword(
    auth: AuthContext,
    input: z.output<typeof changePasswordInputSchema>,
  ): Promise<void> {
    const currentHash = await this.credentials.findPasswordHash(auth.userId)
    const isValid = currentHash
      ? await this.passwordHasher.verify(currentHash, input.currentPassword)
      : false

    if (!isValid) {
      throw new AppError(ApiErrorCode.INVALID_CREDENTIALS)
    }

    await this.credentials.upsertPasswordHash(
      auth.userId,
      await this.passwordHasher.hash(input.newPassword),
    )
    await this.sessionsService.revokeOthers(auth)
  }

  private async startSession(user: User, userAgent: string | undefined): Promise<AuthResponse> {
    const session = await this.sessionsService.issue(user.id, userAgent)
    return { user: toPrivateProfile(user), session }
  }
}
