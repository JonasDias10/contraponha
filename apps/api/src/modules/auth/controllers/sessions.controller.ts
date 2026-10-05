import { Controller, Delete, Get, HttpCode, HttpStatus, Param } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import type { SessionListResponse } from "@ponto/types"
import { sessionListSchema } from "@ponto/validation"
import { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import {
  ApiStandardErrors,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { SessionsService } from "#src/modules/auth/services/sessions.service.js"

@ApiTags("auth")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller("auth/sessions")
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: "List active sessions of the authenticated user" })
  @ApiOkResponse({ schema: toOpenApiSchema(sessionListSchema) })
  async list(@CurrentAuth() auth: AuthContext): Promise<SessionListResponse> {
    const sessions = await this.sessionsService.list(auth)
    return { sessions }
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "End every session except the current one" })
  @ApiNoContentResponse()
  revokeOthers(@CurrentAuth() auth: AuthContext): Promise<void> {
    return this.sessionsService.revokeOthers(auth)
  }

  @Delete(":sessionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "End a specific session" })
  @ApiNoContentResponse()
  revoke(
    @CurrentAuth() auth: AuthContext,
    @Param("sessionId", new ZodValidationPipe(z.uuid())) sessionId: string,
  ): Promise<void> {
    return this.sessionsService.revoke({ userId: auth.userId, sessionId })
  }
}
