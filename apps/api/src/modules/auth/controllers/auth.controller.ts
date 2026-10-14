import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  Put,
} from "@nestjs/common"
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import type { AuthResponse, HandleAvailability, LoginResult } from "@contraponha/types"
import {
  authResponseSchema,
  changePasswordInputSchema,
  confirmEmailInputSchema,
  handleAvailabilitySchema,
  handleSchema,
  loginInputSchema,
  loginResultSchema,
  loginTwoFactorInputSchema,
  registerInputSchema,
  requestPasswordResetInputSchema,
  resetPasswordInputSchema,
} from "@contraponha/validation"
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
import { UsersService } from "#src/modules/users/services/users.service.js"
import { AccountVerificationService } from "#src/modules/auth/services/account-verification.service.js"
import { AuthService } from "#src/modules/auth/services/auth.service.js"
import { SessionsService } from "#src/modules/auth/services/sessions.service.js"

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
    @Ip() ip: string | undefined,
  ): Promise<AuthResponse> {
    return this.authService.register({ input: body, client: { userAgent, acceptLanguage, ip } })
  }

  @Public()
  @Get("handles/:handle/availability")
  @ApiOperation({ summary: "Whether a username can be taken by a new account" })
  @ApiOkResponse({ schema: toOpenApiSchema(handleAvailabilitySchema) })
  async handleAvailability(
    @Param("handle", new ZodValidationPipe(handleSchema)) handle: string,
  ): Promise<HandleAvailability> {
    const isAvailable = await this.usersService.isHandleAvailable(handle)

    return { handle, isAvailable }
  }

  @Public()
  @SensitiveRateLimit()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Start a session with email and password",
    description:
      "Accounts with two-step verification get a challengeToken instead of a session; finish with POST /auth/login/two-factor.",
  })
  @ApiZodBody(loginInputSchema)
  @ApiOkResponse({ schema: toOpenApiSchema(loginResultSchema) })
  login(
    @Body(new ZodValidationPipe(loginInputSchema)) body: z.output<typeof loginInputSchema>,
    @Headers("user-agent") userAgent: string | undefined,
  ): Promise<LoginResult> {
    return this.authService.login({ input: body, userAgent })
  }

  @Public()
  @SensitiveRateLimit()
  @Post("login/two-factor")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Finish a login with the code from the authenticator or a recovery code",
  })
  @ApiZodBody(loginTwoFactorInputSchema)
  @ApiOkResponse({ schema: toOpenApiSchema(authResponseSchema) })
  loginTwoFactor(
    @Body(new ZodValidationPipe(loginTwoFactorInputSchema))
    body: z.output<typeof loginTwoFactorInputSchema>,
  ): Promise<AuthResponse> {
    return this.authService.loginTwoFactor({ input: body })
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "End the current session" })
  @ApiNoContentResponse()
  logout(@CurrentAuth() auth: AuthContext): Promise<void> {
    return this.sessionsService.revoke({ userId: auth.userId, sessionId: auth.sessionId })
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
    return this.authService.changePassword({ auth, input: body })
  }

  @SensitiveRateLimit()
  @Post("email-verification")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Send a new email verification link" })
  @ApiAcceptedResponse()
  async resendEmailVerification(@CurrentAuth() auth: AuthContext): Promise<void> {
    const user = await this.usersService.getById(auth.userId)

    await this.accountVerification.sendEmailVerification(user)
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
    return this.accountVerification.resetPassword(body)
  }
}
