import { Controller, Delete, HttpCode, HttpStatus, Param, Put, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ReactionTargetType, type ReactionKind } from "@contraponha/types"
import { reactionKindSchema } from "@contraponha/validation"

import { Write } from "#src/common/auth/write-action.decorator.js"
import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import { ApiStandardErrors, SESSION_SECURITY_SCHEME } from "#src/common/openapi/swagger.js"
import { UuidParam } from "#src/common/validation/uuid-param.decorator.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { ReactionsService } from "#src/modules/reactions/services/reactions.service.js"
import { WriteAction } from "#src/modules/users/domain/write-limits.js"
import { WriteGuard } from "#src/modules/users/guards/write.guard.js"

const kindPipe = new ZodValidationPipe(reactionKindSchema)

@ApiTags("reactions")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller()
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Put("posts/:postId/reactions/:kind")
  @UseGuards(WriteGuard)
  @Write(WriteAction.REACTION)
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
  @UseGuards(WriteGuard)
  @Write(WriteAction.REACTION)
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
}
