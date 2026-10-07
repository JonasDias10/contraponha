import { Inject, Injectable, Logger } from "@nestjs/common"
import { hoursToMs, minutesToMs } from "@contraponha/config"
import { runTransaction, type Database, type VerificationTokenPurpose } from "@contraponha/database"
import { ApiErrorCode } from "@contraponha/types"

import { AppError } from "#src/common/errors/app-error.js"
import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import {
  DATA_EXPORT_RETENTION_DAYS,
  EMAIL_VERIFICATION_TTL_HOURS,
  PASSWORD_RESET_TTL_MINUTES,
} from "#src/config/durations.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { EmailSender, type EmailMessage } from "#src/infrastructure/email/email-sender.js"
import {
  buildDataExportReadyEmail,
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
  type AccountEmailRecipient,
} from "#src/modules/auth/domain/account-emails.js"
import {
  DATA_SETTINGS_PATH,
  EMAIL_VERIFICATION_PATH,
  PASSWORD_RESET_PATH,
} from "#src/modules/auth/domain/account-links.js"
import { generateOpaqueToken, hashOpaqueToken } from "#src/modules/auth/domain/opaque-token.js"
import { PasswordHasher } from "#src/modules/auth/infrastructure/password-hasher.js"
import { CredentialsRepository } from "#src/modules/auth/repositories/credentials.repository.js"
import { VerificationTokensRepository } from "#src/modules/auth/repositories/verification-tokens.repository.js"
import { userLocale, type User } from "#src/modules/users/domain/user.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

import { SessionsService } from "./sessions.service.js"

interface ToRecipientParams {
  user: User
  link: string
}

interface BuildAccountLinkParams {
  path: string
  token: string
}

interface IssueVerificationTokenParams {
  userId: string
  purpose: VerificationTokenPurpose
  ttlMs: number
}

export interface ResetPasswordParams {
  token: string
  newPassword: string
}

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
    if (user.emailVerifiedAt) return

    const token = await this.issueToken({
      userId: user.id,
      purpose: "email_verification",
      ttlMs: hoursToMs(EMAIL_VERIFICATION_TTL_HOURS),
    })

    const link = this.buildLink({ path: EMAIL_VERIFICATION_PATH, token })

    this.deliver(
      buildEmailVerificationEmail({
        recipient: this.toRecipient({ user, link }),
        ttlHours: EMAIL_VERIFICATION_TTL_HOURS,
      }),
    )
  }

  async confirmEmail(token: string): Promise<void> {
    await runTransaction({
      db: this.db,
      work: async (tx) => {
        const userId = await this.verificationTokens.consume({
          tokenHash: hashOpaqueToken(token),
          purpose: "email_verification",
          executor: tx,
        })

        if (!userId) throw new AppError(ApiErrorCode.INVALID_TOKEN)

        await this.usersService.markEmailVerified({ id: userId, executor: tx })
      },
    })
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email)

    if (!user) return

    const token = await this.issueToken({
      userId: user.id,
      purpose: "password_reset",
      ttlMs: minutesToMs(PASSWORD_RESET_TTL_MINUTES),
    })

    const link = this.buildLink({ path: PASSWORD_RESET_PATH, token })

    this.deliver(
      buildPasswordResetEmail({
        recipient: this.toRecipient({ user, link }),
        ttlMinutes: PASSWORD_RESET_TTL_MINUTES,
      }),
    )
  }

  async sendDataExportReady(userId: string): Promise<void> {
    const user = await this.usersService.getById(userId)
    const link = new URL(DATA_SETTINGS_PATH, this.config.webAppUrl).toString()

    this.deliver(
      buildDataExportReadyEmail({
        recipient: this.toRecipient({ user, link }),
        retentionDays: DATA_EXPORT_RETENTION_DAYS,
      }),
    )
  }

  async resetPassword({ token, newPassword }: ResetPasswordParams): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(newPassword)

    const revokedTokenHashes = await runTransaction({
      db: this.db,
      work: async (tx) => {
        const userId = await this.verificationTokens.consume({
          tokenHash: hashOpaqueToken(token),
          purpose: "password_reset",
          executor: tx,
        })

        if (!userId) throw new AppError(ApiErrorCode.INVALID_TOKEN)

        await this.credentials.upsertPasswordHash({ userId, passwordHash, executor: tx })

        await this.usersService.markEmailVerified({ id: userId, executor: tx })

        return this.sessionsService.revokeAll({ userId, executor: tx })
      },
    })

    await this.sessionsService.evictFromCache(revokedTokenHashes)
  }

  private async issueToken({
    userId,
    purpose,
    ttlMs,
  }: IssueVerificationTokenParams): Promise<string> {
    const token = generateOpaqueToken()

    await this.verificationTokens.replace({
      data: {
        userId,
        purpose,
        tokenHash: hashOpaqueToken(token),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    })

    return token
  }

  private buildLink({ path, token }: BuildAccountLinkParams): string {
    const url = new URL(path, this.config.webAppUrl)

    url.searchParams.set("token", token)

    return url.toString()
  }

  private toRecipient({ user, link }: ToRecipientParams): AccountEmailRecipient {
    return {
      to: user.email,
      name: user.displayName,
      locale: userLocale(user),
      link,
      webAppUrl: this.config.webAppUrl,
    }
  }

  private deliver(message: EmailMessage): void {
    this.emailSender.send(message).catch((error: unknown) => {
      this.logger.error({ err: error, subject: message.subject }, "Failed to send account email")
    })
  }
}
