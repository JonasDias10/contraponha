import { Controller, Get, Param, Query } from "@nestjs/common"
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type { DiscussionList, FeedItem, Page } from "@ponto/types"
import {
  discussionListSchema,
  feedPageSchema,
  paginationQuerySchema,
  topicSlugSchema,
} from "@ponto/validation"
import type { z } from "zod"

import { CurrentAuth, CurrentViewer, type AuthContext } from "#src/common/auth/auth-context.js"
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
  @ApiOkResponse({ schema: toOpenApiSchema(feedPageSchema) })
  following(
    @CurrentAuth() auth: AuthContext,
    @Query(paginationPipe) query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<FeedItem>> {
    return this.feedService.following({
      userId: auth.userId,
      cursor: query.cursor,
      limit: query.limit,
    })
  }

  @Public()
  @Get("discover")
  @ApiOperation({
    summary:
      "Recent posts ranked by quality signals with time decay, boosted by followed topics; each says why it is shown",
  })
  @ApiOkResponse({ schema: toOpenApiSchema(feedPageSchema) })
  discover(
    @CurrentViewer() viewer: AuthContext | undefined,
    @Query(paginationPipe) query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<FeedItem>> {
    return this.feedService.discover({
      viewerId: viewer?.userId,
      cursor: query.cursor,
      limit: query.limit,
    })
  }

  @Public()
  @Get("discussions")
  @ApiOperation({ summary: "Titled posts with the liveliest discussions this week" })
  @ApiOkResponse({ schema: toOpenApiSchema(discussionListSchema) })
  discussions(): Promise<DiscussionList> {
    return this.feedService.ongoingDiscussions()
  }

  @Public()
  @Get("topics/:slug")
  @ApiOperation({ summary: "Posts in a topic, newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(feedPageSchema) })
  topic(
    @CurrentViewer() viewer: AuthContext | undefined,
    @Param("slug", new ZodValidationPipe(topicSlugSchema)) slug: string,
    @Query(paginationPipe) query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<FeedItem>> {
    return this.feedService.topic({
      slug,
      viewerId: viewer?.userId,
      cursor: query.cursor,
      limit: query.limit,
    })
  }
}
