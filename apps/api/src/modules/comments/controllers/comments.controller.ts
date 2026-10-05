import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Query } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import type { CommentView, ContentRevisionList, Page } from "@ponto/types"
import {
  commentPageSchema,
  commentViewSchema,
  contentRevisionListSchema,
  paginationQuerySchema,
  updateCommentInputSchema,
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
@Controller("comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Public()
  @Get(":commentId/replies")
  @ApiOperation({ summary: "Replies in a comment's thread, oldest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(commentPageSchema) })
  listReplies(
    @UuidParam("commentId") commentId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<CommentView>> {
    return this.commentsService.listReplies({
      commentId,
      cursor: query.cursor,
      limit: query.limit,
    })
  }

  @Patch(":commentId")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Edit a comment during its edit window (author only)" })
  @ApiZodBody(updateCommentInputSchema)
  @ApiOkResponse({ schema: toOpenApiSchema(commentViewSchema) })
  update(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("commentId") commentId: string,
    @Body(new ZodValidationPipe(updateCommentInputSchema))
    body: z.output<typeof updateCommentInputSchema>,
  ): Promise<CommentView> {
    return this.commentsService.update({ commentId, userId: auth.userId, body: body.body })
  }

  @Delete(":commentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Remove a comment (author only); its content and history are erased" })
  @ApiNoContentResponse()
  delete(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("commentId") commentId: string,
  ): Promise<void> {
    return this.commentsService.delete({ commentId, userId: auth.userId })
  }

  @Public()
  @Get(":commentId/revisions")
  @ApiOperation({ summary: "Previous versions of an edited comment, newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(contentRevisionListSchema) })
  listRevisions(@UuidParam("commentId") commentId: string): Promise<ContentRevisionList> {
    return this.commentsService.listRevisions(commentId)
  }
}
