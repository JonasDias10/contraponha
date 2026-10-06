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
  commentPageSchema,
  commentViewSchema,
  createCommentInputSchema,
  paginationQuerySchema,
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
  @ApiOperation({
    summary: "Comment on a post or reply to a comment",
    description: "Replying to a reply attaches the answer to the thread's top-level comment.",
  })
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
      parentId: body.parentId,
    })
  }

  @Public()
  @Get()
  @ApiOperation({ summary: "Top-level comments of a post, oldest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(commentPageSchema) })
  list(
    @UuidParam("postId") postId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<CommentView>> {
    return this.commentsService.listForPost({ postId, cursor: query.cursor, limit: query.limit })
  }
}
