import { Controller, Get, Query } from "@nestjs/common"
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type { Page, PostView } from "@ponto/types"
import { paginationQuerySchema, postPageSchema } from "@ponto/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import { Public } from "#src/common/auth/public.decorator.js"
import {
  ApiStandardErrors,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { FeedService } from "#src/modules/feed/services/feed.service.js"

const paginationPipe = new ZodValidationPipe(paginationQuerySchema)

@ApiTags("feed")
@ApiStandardErrors()
@Controller("feed")
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get("following")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Posts from people the user follows (and their own), newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(postPageSchema) })
  following(
    @CurrentAuth() auth: AuthContext,
    @Query(paginationPipe) query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<PostView>> {
    return this.feedService.following({
      userId: auth.userId,
      cursor: query.cursor,
      limit: query.limit,
    })
  }

  @Public()
  @Get("featured")
  @ApiOperation({
    summary: "Featured posts from the last 7 days, ranked by quality signals with time decay",
  })
  @ApiOkResponse({ schema: toOpenApiSchema(postPageSchema) })
  featured(
    @Query(paginationPipe) query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<PostView>> {
    return this.feedService.featured({ cursor: query.cursor, limit: query.limit })
  }
}
