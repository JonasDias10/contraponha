import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Put } from "@nestjs/common"
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import type { AuthResponse } from "@ponto/types"
import {
  authResponseSchema,
  changePasswordInputSchema,
  confirmEmailInputSchema,
  loginInputSchema,
  registerInputSchema,
  requestPasswordResetInputSchema,
  resetPasswordInputSchema,
} from "@ponto/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import { Public } from "#src/common/auth/public.decorator.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { SensitiveRateLimit } from "#src/common/rate-limit/rate-limit.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { UsersService } from "#src/modules/users/users.service.js"
import { AccountVerificationService } from "./account-verification.service.js"
import { AuthService } from "./auth.service.js"
import { SessionsService } from "./sessions.service.js"

@ApiTags("auth")
@ApiStandardErrors()
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionsService: SessionsService,
    private readonly accountVerification: AccountVerificationService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @SensitiveRateLimit()
  @Post("register")
  @ApiOperation({ summary: "Create an account and start a session" })
  @ApiZodBody(registerInputSchema)
  @ApiCreatedResponse({ schema: toOpenApiSchema(authResponseSchema) })
  register(
    @Body(new ZodValidationPipe(registerInputSchema)) body: z.output<typeof registerInputSchema>,
    @Headers("user-agent") userAgent: string | undefined,
    @Headers("accept-language") acceptLanguage: string | undefined,
  ): Promise<AuthResponse> {
    return this.authService.register(body, { userAgent, acceptLanguage })
  }

  @Public()
  @SensitiveRateLimit()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Start a session with email and password" })
  @ApiZodBody(loginInputSchema)
  @ApiOkResponse({ schema: toOpenApiSchema(authResponseSchema) })
  login(
    @Body(new ZodValidationPipe(loginInputSchema)) body: z.output<typeof loginInputSchema>,
    @Headers("user-agent") userAgent: string | undefined,
  ): Promise<AuthResponse> {
    return this.authService.login(body, userAgent)
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "End the current session" })
  @ApiNoContentResponse()
  logout(@CurrentAuth() auth: AuthContext): Promise<void> {
    return this.sessionsService.revoke(auth.userId, auth.sessionId)
  }

  @SensitiveRateLimit()
  @Put("password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Change password and end every other session" })
  @ApiZodBody(changePasswordInputSchema)
  @ApiNoContentResponse()
  changePassword(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(changePasswordInputSchema))
    body: z.output<typeof changePasswordInputSchema>,
  ): Promise<void> {
    return this.authService.changePassword(auth, body)
  }

  @SensitiveRateLimit()
  @Post("email-verification")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Send a new email verification link" })
  @ApiAcceptedResponse()
  async resendEmailVerification(@CurrentAuth() auth: AuthContext): Promise<void> {
    await this.accountVerification.sendEmailVerification(
      await this.usersService.getById(auth.userId),
    )
  }

  @Public()
  @Post("email-verification/confirm")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Confirm email ownership with the emailed token" })
  @ApiZodBody(confirmEmailInputSchema)
  @ApiNoContentResponse()
  confirmEmail(
    @Body(new ZodValidationPipe(confirmEmailInputSchema))
    body: z.output<typeof confirmEmailInputSchema>,
  ): Promise<void> {
    return this.accountVerification.confirmEmail(body.token)
  }

  @Public()
  @SensitiveRateLimit()
  @Post("password-reset")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Email a password reset link",
    description: "Always responds 202, whether or not the email belongs to an account.",
  })
  @ApiZodBody(requestPasswordResetInputSchema)
  @ApiAcceptedResponse()
  requestPasswordReset(
    @Body(new ZodValidationPipe(requestPasswordResetInputSchema))
    body: z.output<typeof requestPasswordResetInputSchema>,
  ): Promise<void> {
    return this.accountVerification.requestPasswordReset(body.email)
  }

  @Public()
  @SensitiveRateLimit()
  @Post("password-reset/confirm")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Set a new password with the emailed token and end every session" })
  @ApiZodBody(resetPasswordInputSchema)
  @ApiNoContentResponse()
  resetPassword(
    @Body(new ZodValidationPipe(resetPasswordInputSchema))
    body: z.output<typeof resetPasswordInputSchema>,
  ): Promise<void> {
    return this.accountVerification.resetPassword(body.token, body.newPassword)
  }
}
