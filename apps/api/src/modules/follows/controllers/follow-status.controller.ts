import { Controller, Get, Query } from "@nestjs/common"
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type { FollowedAmong } from "@ponto/types"
import { followedAmongQuerySchema, followedAmongSchema } from "@ponto/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import {
  ApiStandardErrors,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { FollowsService } from "#src/modules/follows/services/follows.service.js"

@ApiTags("follows")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller("follows")
export class FollowStatusController {
  constructor(private readonly followsService: FollowsService) {}

  // Lists of people (followers, search, suggestions) ask once for the whole page.
  @Get("status")
  @ApiOperation({ summary: "Which of these users the authenticated user follows" })
  @ApiOkResponse({ schema: toOpenApiSchema(followedAmongSchema) })
  followedAmong(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(followedAmongQuerySchema))
    query: z.output<typeof followedAmongQuerySchema>,
  ): Promise<FollowedAmong> {
    return this.followsService.followedAmong({ followerId: auth.userId, userIds: query.userIds })
  }
}
