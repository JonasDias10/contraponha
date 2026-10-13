import { Injectable } from "@nestjs/common"
import type {
  ContributionSearchResult,
  Page,
  PostSearchResult,
  PublicProfile,
  SearchPeriod,
  SearchSort,
  TopicList,
} from "@contraponha/types"
import { z } from "zod"

import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { CommentsService } from "#src/modules/comments/services/comments.service.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"
import {
  periodStart,
  SEARCH_MAX_OFFSET,
  TOPIC_RESULTS_LIMIT,
} from "#src/modules/search/domain/search-pagination.js"
import {
  SearchRepository,
  type ContentFilters,
} from "#src/modules/search/repositories/search.repository.js"
import { TopicsService } from "#src/modules/topics/services/topics.service.js"
import { toPublicProfile } from "#src/modules/users/domain/user.js"

const searchCursorSchema = z.object({
  offset: z.coerce.number().int().min(0).max(SEARCH_MAX_OFFSET),
})

export interface SearchRequest {
  query: string
  viewerId: string | undefined
  cursor: string | undefined
  limit: number
}

export interface ContentFilterInput {
  sort: SearchSort
  period: SearchPeriod
  hasSource?: boolean
  followingOnly?: boolean
  hasHighlights?: boolean
}

export interface ContentSearchRequest extends SearchRequest {
  filters: ContentFilterInput
  viewerId: string | undefined
}

export interface TopicSearchRequest {
  query: string
  viewerId: string | undefined
}

interface ToSearchPageParams<TItem> {
  items: TItem[]
  offset: number
  limit: number
}

function toSearchPage<TItem>({ items, offset, limit }: ToSearchPageParams<TItem>): Page<TItem> {
  const nextOffset = offset + limit

  const page = buildPage({
    rows: items,
    limit,
    toItem: (item) => item,
    toCursor: () => ({ offset: String(nextOffset) }),
  })

  return nextOffset > SEARCH_MAX_OFFSET ? { ...page, nextCursor: null } : page
}

interface ToContentFiltersParams {
  filters: ContentFilterInput
  viewerId: string | undefined
}

// "Only from people I follow" needs a signed-in reader; anonymous searches ignore it.
function toContentFilters({ filters, viewerId }: ToContentFiltersParams): ContentFilters {
  return {
    sort: filters.sort,
    since: periodStart({ period: filters.period, now: new Date() }),
    hasSource: filters.hasSource ?? false,
    hasHighlights: filters.hasHighlights ?? false,
    followedBy: filters.followingOnly ? viewerId : undefined,
  }
}

@Injectable()
export class SearchService {
  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
    private readonly topicsService: TopicsService,
  ) {}

  async users({ query, viewerId, cursor, limit }: SearchRequest): Promise<Page<PublicProfile>> {
    const offset = decodeCursor({ cursor, schema: searchCursorSchema })?.offset ?? 0

    const rows = await this.searchRepository.searchUsers({
      query,
      viewerId,
      offset,
      limit: limit + 1,
    })

    return toSearchPage({ items: rows.map(toPublicProfile), offset, limit })
  }

  async posts({
    query,
    cursor,
    limit,
    filters,
    viewerId,
  }: ContentSearchRequest): Promise<Page<PostSearchResult>> {
    const offset = decodeCursor({ cursor, schema: searchCursorSchema })?.offset ?? 0

    const rows = await this.searchRepository.searchPosts({
      query,
      viewerId,
      offset,
      limit: limit + 1,
      filters: toContentFilters({ filters, viewerId }),
    })

    const views = await this.postsService.buildViews({
      rows: rows.map(({ post }) => post),
      viewerId,
    })

    const items = views.map((post, index) => ({ post, highlight: rows[index]?.highlight ?? null }))

    return toSearchPage({ items, offset, limit })
  }

  async contributions({
    query,
    cursor,
    limit,
    filters,
    viewerId,
  }: ContentSearchRequest): Promise<Page<ContributionSearchResult>> {
    const offset = decodeCursor({ cursor, schema: searchCursorSchema })?.offset ?? 0

    const rows = await this.searchRepository.searchComments({
      query,
      viewerId,
      offset,
      limit: limit + 1,
      filters: toContentFilters({ filters, viewerId }),
    })

    const contributions = await this.commentsService.buildContributions({
      rows: rows.map(({ comment }) => comment),
      viewerId,
    })

    const items = contributions.map((contribution, index) => ({
      contribution,
      highlight: rows[index]?.highlight ?? null,
    }))

    return toSearchPage({ items, offset, limit })
  }

  async topics({ query, viewerId }: TopicSearchRequest): Promise<TopicList> {
    const found = await this.topicsService.search({
      q: query,
      limit: TOPIC_RESULTS_LIMIT,
      viewerId,
    })

    return { topics: found }
  }
}
