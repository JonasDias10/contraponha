import { Inject, Injectable, Logger } from "@nestjs/common"
import { hoursToMs, minutesToMs } from "@ponto/config"
import type { Database, VerificationTokenPurpose } from "@ponto/database"
import { ApiErrorCode } from "@ponto/types"

import { AppError } from "#src/common/errors/app-error.js"
import { EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_MINUTES } from "#src/config/durations.js"
import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { EmailSender, type EmailMessage } from "#src/infrastructure/email/email-sender.js"
import { userLocale, type User } from "#src/modules/users/user.js"
import { UsersService } from "#src/modules/users/users.service.js"
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
  type AccountEmailInput,
} from "./account-emails.js"
import { EMAIL_VERIFICATION_PATH, PASSWORD_RESET_PATH } from "./account-links.js"
import { CredentialsRepository } from "./credentials.repository.js"
import { generateOpaqueToken, hashOpaqueToken } from "./opaque-token.js"
import { PasswordHasher } from "./password-hasher.js"
import { SessionsService } from "./sessions.service.js"
import { VerificationTokensRepository } from "./verification-tokens.repository.js"

@Injectable()
export class AccountVerificationService {
  private readonly logger = new Logger(AccountVerificationService.name)

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DATABASE) private readonly db: Database,
    private readonly usersService: UsersService,
    private readonly verificationTokens: VerificationTokensRepository,
    private readonly credentials: CredentialsRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionsService: SessionsService,
    private readonly emailSender: EmailSender,
  ) {}

  async sendEmailVerification(user: User): Promise<void> {
    if (user.emailVerifiedAt) {
      return
    }

    const token = await this.issueToken(
      user.id,
      "email_verification",
      hoursToMs(EMAIL_VERIFICATION_TTL_HOURS),
    )
    this.deliver(
      buildEmailVerificationEmail(
        this.recipient(user, this.link(EMAIL_VERIFICATION_PATH, token)),
        EMAIL_VERIFICATION_TTL_HOURS,
      ),
    )
  }

  async confirmEmail(token: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const userId = await this.verificationTokens.consume(
        hashOpaqueToken(token),
        "email_verification",
        tx,
      )

      if (!userId) {
        throw new AppError(ApiErrorCode.INVALID_TOKEN)
      }

      await this.usersService.markEmailVerified(userId, tx)
    })
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email)

    if (!user) {
      return
    }

    const token = await this.issueToken(
      user.id,
      "password_reset",
      minutesToMs(PASSWORD_RESET_TTL_MINUTES),
    )
    this.deliver(
      buildPasswordResetEmail(
        this.recipient(user, this.link(PASSWORD_RESET_PATH, token)),
        PASSWORD_RESET_TTL_MINUTES,
      ),
    )
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(newPassword)
    const revokedTokenHashes = await this.db.transaction(async (tx) => {
      const userId = await this.verificationTokens.consume(
        hashOpaqueToken(token),
        "password_reset",
        tx,
      )

      if (!userId) {
        throw new AppError(ApiErrorCode.INVALID_TOKEN)
      }

      await this.credentials.upsertPasswordHash(userId, passwordHash, tx)
      await this.usersService.markEmailVerified(userId, tx)
      return this.sessionsService.revokeAll(userId, tx)
    })
    await this.sessionsService.evictFromCache(revokedTokenHashes)
  }

  private async issueToken(
    userId: string,
    purpose: VerificationTokenPurpose,
    ttlMs: number,
  ): Promise<string> {
    const token = generateOpaqueToken()
    await this.verificationTokens.replace({
      userId,
      purpose,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
    })
    return token
  }

  private link(path: string, token: string): string {
    const url = new URL(path, this.config.webAppUrl)
    url.searchParams.set("token", token)
    return url.toString()
  }

  private recipient(user: User, link: string): AccountEmailInput {
    return { to: user.email, name: user.displayName, locale: userLocale(user), link }
  }

  private deliver(message: EmailMessage): void {
    this.emailSender.send(message).catch((error: unknown) => {
      this.logger.error({ err: error, subject: message.subject }, "Failed to send account email")
    })
  }
}
