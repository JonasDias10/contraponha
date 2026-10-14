import { Inject, Injectable } from "@nestjs/common"
import { runTransaction, type Database } from "@contraponha/database"
import {
  ApiErrorCode,
  type RecoveryCodes,
  type TwoFactorSetup,
  type TwoFactorStatus,
} from "@contraponha/types"
import { generateSecret, generateURI, verify } from "otplib"

import { AppError } from "#src/common/errors/app-error.js"
import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  isRecoveryCode,
} from "#src/modules/auth/domain/two-factor.js"
import { TwoFactorRepository } from "#src/modules/auth/repositories/two-factor.repository.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const ISSUER = "Contraponha"
// One step either side of now absorbs small clock differences on the phone.
const EPOCH_TOLERANCE_SECONDS = 30

export interface TwoFactorCodeParams {
  userId: string
  code: string
}

interface TotpCheckParams {
  secret: string
  code: string
}

@Injectable()
export class TwoFactorService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly repository: TwoFactorRepository,
    private readonly usersService: UsersService,
  ) {}

  async status(userId: string): Promise<TwoFactorStatus> {
    const row = await this.repository.find(userId)
    const isEnabled = Boolean(row?.enabledAt)
    const recoveryCodesLeft = isEnabled ? await this.repository.countUnusedCodes(userId) : 0

    return { isEnabled, recoveryCodesLeft }
  }

  async isEnabled(userId: string): Promise<boolean> {
    const row = await this.repository.find(userId)

    return Boolean(row?.enabledAt)
  }

  // Starts (or restarts) setup with a new secret; nothing changes until enable confirms it.
  async startSetup(userId: string): Promise<TwoFactorSetup> {
    const user = await this.usersService.getById(userId)
    const existing = await this.repository.find(userId)

    if (existing?.enabledAt) throw new AppError(ApiErrorCode.CONFLICT)

    const secret = generateSecret()

    await this.repository.saveSetup({
      userId,
      secretCiphertext: encryptSecret({ secret, key: this.config.twoFactor.encryptionKey }),
    })

    return { secret, otpauthUrl: generateURI({ issuer: ISSUER, label: `@${user.handle}`, secret }) }
  }

  async enable({ userId, code }: TwoFactorCodeParams): Promise<RecoveryCodes> {
    const row = await this.repository.find(userId)

    if (!row || row.enabledAt) throw new AppError(ApiErrorCode.CONFLICT)

    const step = await this.totpStep({ secret: this.secretOf(row.secretCiphertext), code })

    if (step === undefined) throw new AppError(ApiErrorCode.INVALID_TWO_FACTOR_CODE)

    const codes = generateRecoveryCodes()

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.repository.enable({
          userId,
          step,
          codeHashes: codes.map(hashRecoveryCode),
          executor: tx,
        })

        await this.usersService.updateProfile({
          id: userId,
          data: { twoFactorEnabledAt: new Date() },
          executor: tx,
        })
      },
    })

    return { codes }
  }

  async disable({ userId, code }: TwoFactorCodeParams): Promise<void> {
    await this.assertCode({ userId, code })

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.repository.deleteForUser({ userId, executor: tx })

        await this.usersService.updateProfile({
          id: userId,
          data: { twoFactorEnabledAt: null },
          executor: tx,
        })
      },
    })
  }

  async regenerateRecoveryCodes({ userId, code }: TwoFactorCodeParams): Promise<RecoveryCodes> {
    await this.assertCode({ userId, code })

    const codes = generateRecoveryCodes()

    await runTransaction({
      db: this.db,
      work: (tx) =>
        this.repository.replaceCodes({
          userId,
          codeHashes: codes.map(hashRecoveryCode),
          executor: tx,
        }),
    })

    return { codes }
  }

  // A code from the authenticator (each time step accepted once) or an unused recovery code.
  async assertCode({ userId, code }: TwoFactorCodeParams): Promise<void> {
    const row = await this.repository.find(userId)

    if (!row?.enabledAt) throw new AppError(ApiErrorCode.INVALID_TWO_FACTOR_CODE)

    if (isRecoveryCode(code)) {
      const isUsed = await this.repository.useRecoveryCode({
        userId,
        codeHash: hashRecoveryCode(code),
      })

      if (!isUsed) throw new AppError(ApiErrorCode.INVALID_TWO_FACTOR_CODE)

      return
    }

    const step = await this.totpStep({ secret: this.secretOf(row.secretCiphertext), code })
    const isFresh = step !== undefined && (await this.repository.markStepUsed({ userId, step }))

    if (!isFresh) throw new AppError(ApiErrorCode.INVALID_TWO_FACTOR_CODE)
  }

  private secretOf(ciphertext: string): string {
    return decryptSecret({ ciphertext, key: this.config.twoFactor.encryptionKey })
  }

  private async totpStep({ secret, code }: TotpCheckParams): Promise<number | undefined> {
    const result = await verify({ secret, token: code, epochTolerance: EPOCH_TOLERANCE_SECONDS })

    return result.valid && "timeStep" in result ? result.timeStep : undefined
  }
}
