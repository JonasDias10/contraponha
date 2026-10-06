import { Controller, Get, Query } from "@nestjs/common"
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type { Page, PostView, PublicProfile } from "@ponto/types"
import { postPageSchema, profilePageSchema, searchQuerySchema } from "@ponto/validation"
import type { z } from "zod"

import { Public } from "#src/common/auth/public.decorator.js"
import { ApiStandardErrors, toOpenApiSchema } from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { SearchService } from "#src/modules/search/services/search.service.js"

const searchPipe = new ZodValidationPipe(searchQuerySchema)

@ApiTags("search")
@ApiStandardErrors()
@Public()
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("users")
  @ApiOperation({ summary: "People by handle or name, tolerant to typos" })
  @ApiOkResponse({ schema: toOpenApiSchema(profilePageSchema) })
  users(
    @Query(searchPipe) query: z.output<typeof searchQuerySchema>,
  ): Promise<Page<PublicProfile>> {
    return this.searchService.users({ query: query.q, cursor: query.cursor, limit: query.limit })
  }

  @Get("posts")
  @ApiOperation({
    summary: "Posts by full-text search in Portuguese",
    description: 'Supports "exact phrases", OR and -exclusions.',
  })
  @ApiOkResponse({ schema: toOpenApiSchema(postPageSchema) })
  posts(@Query(searchPipe) query: z.output<typeof searchQuerySchema>): Promise<Page<PostView>> {
    return this.searchService.posts({ query: query.q, cursor: query.cursor, limit: query.limit })
  }
}
