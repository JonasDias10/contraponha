import { Controller, Get, Param, Query } from "@nestjs/common"
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type { ContributionView, Page } from "@ponto/types"
import { contributionPageSchema, handleSchema, paginationQuerySchema } from "@ponto/validation"
import type { z } from "zod"

import { CurrentViewer, type AuthContext } from "#src/common/auth/auth-context.js"
import { Public } from "#src/common/auth/public.decorator.js"
import { ApiStandardErrors, toOpenApiSchema } from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { CommentsService } from "#src/modules/comments/services/comments.service.js"

const handlePipe = new ZodValidationPipe(handleSchema)
const paginationPipe = new ZodValidationPipe(paginationQuerySchema)

@ApiTags("comments")
@ApiStandardErrors()
@Public()
@Controller("users/:handle")
export class UserContributionsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get("contributions")
  @ApiOperation({ summary: "A person's contributions to discussions, newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(contributionPageSchema) })
  list(
    @CurrentViewer() viewer: AuthContext | undefined,
    @Param("handle", handlePipe) handle: string,
    @Query(paginationPipe) query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<ContributionView>> {
    return this.commentsService.listContributions({
      handle,
      onlyHighlighted: false,
      cursor: query.cursor,
      limit: query.limit,
      viewerId: viewer?.userId,
    })
  }

  @Get("highlighted-contributions")
  @ApiOperation({ summary: "Contributions that post authors highlighted, newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(contributionPageSchema) })
  listHighlighted(
    @CurrentViewer() viewer: AuthContext | undefined,
    @Param("handle", handlePipe) handle: string,
    @Query(paginationPipe) query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<ContributionView>> {
    return this.commentsService.listContributions({
      handle,
      onlyHighlighted: true,
      cursor: query.cursor,
      limit: query.limit,
      viewerId: viewer?.userId,
    })
  }
}
