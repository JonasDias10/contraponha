import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import type { RecoveryCodes, TwoFactorSetup, TwoFactorStatus } from "@contraponha/types"
import {
  recoveryCodesSchema,
  twoFactorCodeInputSchema,
  twoFactorSetupSchema,
  twoFactorStatusSchema,
} from "@contraponha/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { SensitiveRateLimit } from "#src/common/rate-limit/rate-limit.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { TwoFactorService } from "#src/modules/auth/services/two-factor.service.js"

const codePipe = new ZodValidationPipe(twoFactorCodeInputSchema)

@ApiTags("auth")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller("auth/two-factor")
export class TwoFactorController {
  constructor(private readonly twoFactor: TwoFactorService) {}

  @Get()
  @ApiOperation({
    summary: "Whether two-step verification is on and how many recovery codes are left",
  })
  @ApiOkResponse({ schema: toOpenApiSchema(twoFactorStatusSchema) })
  status(@CurrentAuth() auth: AuthContext): Promise<TwoFactorStatus> {
    return this.twoFactor.status(auth.userId)
  }

  @SensitiveRateLimit()
  @Post("setup")
  @ApiOperation({
    summary: "Start setup: a new secret and otpauth:// URL for the authenticator app",
    description: "Nothing changes until POST /auth/two-factor/enable confirms a code.",
  })
  @ApiCreatedResponse({ schema: toOpenApiSchema(twoFactorSetupSchema) })
  setup(@CurrentAuth() auth: AuthContext): Promise<TwoFactorSetup> {
    return this.twoFactor.startSetup(auth.userId)
  }

  @SensitiveRateLimit()
  @Post("enable")
  @ApiOperation({ summary: "Confirm a code to turn it on; returns ten recovery codes, shown once" })
  @ApiZodBody(twoFactorCodeInputSchema)
  @ApiCreatedResponse({ schema: toOpenApiSchema(recoveryCodesSchema) })
  enable(
    @CurrentAuth() auth: AuthContext,
    @Body(codePipe) body: z.output<typeof twoFactorCodeInputSchema>,
  ): Promise<RecoveryCodes> {
    return this.twoFactor.enable({ userId: auth.userId, code: body.code })
  }

  @SensitiveRateLimit()
  @Post("disable")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Turn it off with a current code or a recovery code" })
  @ApiZodBody(twoFactorCodeInputSchema)
  @ApiNoContentResponse()
  disable(
    @CurrentAuth() auth: AuthContext,
    @Body(codePipe) body: z.output<typeof twoFactorCodeInputSchema>,
  ): Promise<void> {
    return this.twoFactor.disable({ userId: auth.userId, code: body.code })
  }

  @SensitiveRateLimit()
  @Post("recovery-codes")
  @ApiOperation({ summary: "Replace the recovery codes; the old ones stop working" })
  @ApiZodBody(twoFactorCodeInputSchema)
  @ApiCreatedResponse({ schema: toOpenApiSchema(recoveryCodesSchema) })
  regenerate(
    @CurrentAuth() auth: AuthContext,
    @Body(codePipe) body: z.output<typeof twoFactorCodeInputSchema>,
  ): Promise<RecoveryCodes> {
    return this.twoFactor.regenerateRecoveryCodes({ userId: auth.userId, code: body.code })
  }
}
