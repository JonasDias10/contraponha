import { Controller, Get, Param, Query } from "@nestjs/common"
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type { Page, PostView } from "@ponto/types"
import { handleSchema, paginationQuerySchema, postPageSchema } from "@ponto/validation"
import type { z } from "zod"

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
  @ApiOperation({ summary: "Posts by a user, newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(postPageSchema) })
  list(
    @Param("handle", new ZodValidationPipe(handleSchema)) handle: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<PostView>> {
    return this.postsService.listByHandle({ handle, cursor: query.cursor, limit: query.limit })
  }
}
