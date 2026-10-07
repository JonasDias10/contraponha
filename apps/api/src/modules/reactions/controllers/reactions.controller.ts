import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Query } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import { ReactionTargetType, type ReactionKind, type ViewerReactionsResponse } from "@ponto/types"
import {
  reactionKindSchema,
  viewerReactionsQuerySchema,
  viewerReactionsResponseSchema,
} from "@ponto/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import {
  ApiStandardErrors,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { UuidParam } from "#src/common/validation/uuid-param.decorator.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { ReactionsService } from "#src/modules/reactions/services/reactions.service.js"

const kindPipe = new ZodValidationPipe(reactionKindSchema)

@ApiTags("reactions")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller()
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Put("posts/:postId/reactions/:kind")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "React to a post (idempotent; at most 2 reactions per person)" })
  @ApiNoContentResponse()
  reactToPost(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("postId") postId: string,
    @Param("kind", kindPipe) kind: ReactionKind,
  ): Promise<void> {
    return this.reactionsService.react({
      target: { type: ReactionTargetType.POST, id: postId },
      userId: auth.userId,
      kind,
    })
  }

  @Delete("posts/:postId/reactions/:kind")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a reaction from a post" })
  @ApiNoContentResponse()
  unreactToPost(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("postId") postId: string,
    @Param("kind", kindPipe) kind: ReactionKind,
  ): Promise<void> {
    return this.reactionsService.unreact({
      target: { type: ReactionTargetType.POST, id: postId },
      userId: auth.userId,
      kind,
    })
  }

  @Put("comments/:commentId/reactions/:kind")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "React to a comment (idempotent; at most 2 reactions per person)" })
  @ApiNoContentResponse()
  reactToComment(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("commentId") commentId: string,
    @Param("kind", kindPipe) kind: ReactionKind,
  ): Promise<void> {
    return this.reactionsService.react({
      target: { type: ReactionTargetType.COMMENT, id: commentId },
      userId: auth.userId,
      kind,
    })
  }

  @Delete("comments/:commentId/reactions/:kind")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a reaction from a comment" })
  @ApiNoContentResponse()
  unreactToComment(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("commentId") commentId: string,
    @Param("kind", kindPipe) kind: ReactionKind,
  ): Promise<void> {
    return this.reactionsService.unreact({
      target: { type: ReactionTargetType.COMMENT, id: commentId },
      userId: auth.userId,
      kind,
    })
  }

  @Get("reactions/mine")
  @ApiOperation({
    summary: "The authenticated user's reactions on a batch of posts or comments",
    description: "targetIds is a comma-separated list of up to 100 ids.",
  })
  @ApiOkResponse({ schema: toOpenApiSchema(viewerReactionsResponseSchema) })
  listMine(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(viewerReactionsQuerySchema))
    query: z.output<typeof viewerReactionsQuerySchema>,
  ): Promise<ViewerReactionsResponse> {
    return this.reactionsService.listViewerReactions({
      userId: auth.userId,
      targetType: query.targetType,
      targetIds: query.targetIds,
    })
  }
}
