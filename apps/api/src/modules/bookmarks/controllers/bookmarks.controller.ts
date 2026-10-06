import { Controller, Delete, Get, HttpCode, HttpStatus, Put, Query } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import type { BookmarkCount, Page, PostView } from "@ponto/types"
import { bookmarkCountSchema, paginationQuerySchema, postPageSchema } from "@ponto/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import {
  ApiStandardErrors,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { UuidParam } from "#src/common/validation/uuid-param.decorator.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { BookmarksService } from "#src/modules/bookmarks/services/bookmarks.service.js"

@ApiTags("bookmarks")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller()
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get("bookmarks")
  @ApiOperation({ summary: "Saved posts, most recently saved first (private)" })
  @ApiOkResponse({ schema: toOpenApiSchema(postPageSchema) })
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<PostView>> {
    return this.bookmarksService.list({
      userId: auth.userId,
      cursor: query.cursor,
      limit: query.limit,
    })
  }

  @Get("bookmarks/count")
  @ApiOperation({ summary: "How many posts are saved" })
  @ApiOkResponse({ schema: toOpenApiSchema(bookmarkCountSchema) })
  count(@CurrentAuth() auth: AuthContext): Promise<BookmarkCount> {
    return this.bookmarksService.count(auth.userId)
  }

  @Put("posts/:postId/bookmark")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Save a post to read later (idempotent)" })
  @ApiNoContentResponse()
  add(@CurrentAuth() auth: AuthContext, @UuidParam("postId") postId: string): Promise<void> {
    return this.bookmarksService.add({ userId: auth.userId, postId })
  }

  @Delete("posts/:postId/bookmark")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a saved post (idempotent)" })
  @ApiNoContentResponse()
  remove(@CurrentAuth() auth: AuthContext, @UuidParam("postId") postId: string): Promise<void> {
    return this.bookmarksService.remove({ userId: auth.userId, postId })
  }
}
