import { Body, Controller, Get, Post, Query } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import type { CommentView, Page } from "@ponto/types"
import {
  commentListQuerySchema,
  commentPageSchema,
  commentViewSchema,
  createCommentInputSchema,
} from "@ponto/validation"
import type { z } from "zod"

import { CurrentAuth, CurrentViewer, type AuthContext } from "#src/common/auth/auth-context.js"
import { Public } from "#src/common/auth/public.decorator.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { UuidParam } from "#src/common/validation/uuid-param.decorator.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { CommentsService } from "#src/modules/comments/services/comments.service.js"

@ApiTags("comments")
@ApiStandardErrors()
@Controller("posts/:postId/comments")
export class PostCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Contribute to a post, or reply to a contribution with parentId" })
  @ApiZodBody(createCommentInputSchema)
  @ApiCreatedResponse({ schema: toOpenApiSchema(commentViewSchema) })
  create(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("postId") postId: string,
    @Body(new ZodValidationPipe(createCommentInputSchema))
    body: z.output<typeof createCommentInputSchema>,
  ): Promise<CommentView> {
    return this.commentsService.create({
      postId,
      authorId: auth.userId,
      body: body.body,
      sources: body.sources ?? [],
      parentId: body.parentId,
    })
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: "Top-level contributions: most relevant (highlighted first) or most recent",
  })
  @ApiOkResponse({ schema: toOpenApiSchema(commentPageSchema) })
  list(
    @CurrentViewer() viewer: AuthContext | undefined,
    @UuidParam("postId") postId: string,
    @Query(new ZodValidationPipe(commentListQuerySchema))
    query: z.output<typeof commentListQuerySchema>,
  ): Promise<Page<CommentView>> {
    return this.commentsService.listForPost({
      postId,
      sort: query.sort,
      cursor: query.cursor,
      limit: query.limit,
      viewerId: viewer?.userId,
    })
  }
}
