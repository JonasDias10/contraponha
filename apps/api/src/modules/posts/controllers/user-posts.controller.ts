import { Controller, Get, Param, Query } from "@nestjs/common"
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type { Page, PostView } from "@contraponha/types"
import { handleSchema, paginationQuerySchema, postPageSchema } from "@contraponha/validation"
import type { z } from "zod"

import { CurrentViewer, type AuthContext } from "#src/common/auth/auth-context.js"
import { Public } from "#src/common/auth/public.decorator.js"
import { ApiStandardErrors, toOpenApiSchema } from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"

@ApiTags("posts")
@ApiStandardErrors()
@Public()
@Controller("users/:handle/posts")
export class UserPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: "Posts by a user, pinned post first, then newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(postPageSchema) })
  list(
    @CurrentViewer() viewer: AuthContext | undefined,
    @Param("handle", new ZodValidationPipe(handleSchema)) handle: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<PostView>> {
    return this.postsService.listByHandle({
      handle,
      cursor: query.cursor,
      limit: query.limit,
      viewerId: viewer?.userId,
    })
  }
}
