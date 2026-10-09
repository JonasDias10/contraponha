import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Put } from "@nestjs/common"
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import { pushTokenSchema, registerPushTokenInputSchema } from "@contraponha/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { PushService } from "#src/modules/push/services/push.service.js"

@ApiTags("notifications")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller("me/push-tokens")
export class PushTokensController {
  constructor(private readonly pushService: PushService) {}

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Register this device's Expo push token for the signed-in person" })
  @ApiZodBody(registerPushTokenInputSchema)
  @ApiNoContentResponse()
  register(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(registerPushTokenInputSchema))
    body: z.output<typeof registerPushTokenInputSchema>,
  ): Promise<void> {
    return this.pushService.register({ userId: auth.userId, ...body })
  }

  @Delete(":token")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Stop sending pushes to this device (sign-out)" })
  @ApiNoContentResponse()
  unregister(
    @CurrentAuth() auth: AuthContext,
    @Param("token", new ZodValidationPipe(pushTokenSchema)) token: string,
  ): Promise<void> {
    return this.pushService.unregister({ userId: auth.userId, token })
  }
}
