import { Controller, Get, Query } from "@nestjs/common"
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type {
  ContributionSearchResult,
  Page,
  PostSearchResult,
  PublicProfile,
  TopicList,
} from "@ponto/types"
import {
  contentSearchQuerySchema,
  contributionSearchPageSchema,
  postSearchPageSchema,
  profilePageSchema,
  searchQuerySchema,
  topicListSchema,
} from "@ponto/validation"
import type { z } from "zod"

import { CurrentViewer, type AuthContext } from "#src/common/auth/auth-context.js"
import { Public } from "#src/common/auth/public.decorator.js"
import { ApiStandardErrors, toOpenApiSchema } from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { SearchService } from "#src/modules/search/services/search.service.js"

const searchPipe = new ZodValidationPipe(searchQuerySchema)
const contentSearchPipe = new ZodValidationPipe(contentSearchQuerySchema)

const CONTENT_SEARCH_DESCRIPTION =
  'Full-text search in Portuguese. Supports "exact phrases", OR and -exclusions. Matches in `highlight` are wrapped in U+0002/U+0003.'

@ApiTags("search")
@ApiStandardErrors()
@Public()
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("users")
  @ApiOperation({ summary: "People by handle, name or headline, tolerant to typos" })
  @ApiOkResponse({ schema: toOpenApiSchema(profilePageSchema) })
  users(
    @Query(searchPipe) query: z.output<typeof searchQuerySchema>,
  ): Promise<Page<PublicProfile>> {
    return this.searchService.users({ query: query.q, cursor: query.cursor, limit: query.limit })
  }

  @Get("posts")
  @ApiOperation({ summary: "Posts by full-text search", description: CONTENT_SEARCH_DESCRIPTION })
  @ApiOkResponse({ schema: toOpenApiSchema(postSearchPageSchema) })
  posts(
    @CurrentViewer() viewer: AuthContext | undefined,
    @Query(contentSearchPipe) query: z.output<typeof contentSearchQuerySchema>,
  ): Promise<Page<PostSearchResult>> {
    return this.searchService.posts({
      query: query.q,
      cursor: query.cursor,
      limit: query.limit,
      filters: query,
      viewerId: viewer?.userId,
    })
  }

  @Get("contributions")
  @ApiOperation({
    summary: "Contributions to discussions by full-text search",
    description: CONTENT_SEARCH_DESCRIPTION,
  })
  @ApiOkResponse({ schema: toOpenApiSchema(contributionSearchPageSchema) })
  contributions(
    @CurrentViewer() viewer: AuthContext | undefined,
    @Query(contentSearchPipe) query: z.output<typeof contentSearchQuerySchema>,
  ): Promise<Page<ContributionSearchResult>> {
    return this.searchService.contributions({
      query: query.q,
      cursor: query.cursor,
      limit: query.limit,
      filters: query,
      viewerId: viewer?.userId,
    })
  }

  @Get("topics")
  @ApiOperation({ summary: "Topics by name, tolerant to typos" })
  @ApiOkResponse({ schema: toOpenApiSchema(topicListSchema) })
  topics(
    @CurrentViewer() viewer: AuthContext | undefined,
    @Query(searchPipe) query: z.output<typeof searchQuerySchema>,
  ): Promise<TopicList> {
    return this.searchService.topics({ query: query.q, viewerId: viewer?.userId })
  }
}
