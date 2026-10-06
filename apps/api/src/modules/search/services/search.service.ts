import { Injectable } from "@nestjs/common"
import type { Page, PostView, PublicProfile } from "@ponto/types"
import { z } from "zod"

import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"
import { SEARCH_MAX_OFFSET } from "#src/modules/search/domain/search-pagination.js"
import { SearchRepository } from "#src/modules/search/repositories/search.repository.js"
import { toPublicProfile } from "#src/modules/users/domain/user.js"

const searchCursorSchema = z.object({
  offset: z.coerce.number().int().min(0).max(SEARCH_MAX_OFFSET),
})

export interface SearchRequest {
  query: string
  cursor: string | undefined
  limit: number
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

@Injectable()
export class SearchService {
  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly postsService: PostsService,
  ) {}

  async users({ query, cursor, limit }: SearchRequest): Promise<Page<PublicProfile>> {
    const offset = decodeCursor({ cursor, schema: searchCursorSchema })?.offset ?? 0
    const rows = await this.searchRepository.searchUsers({ query, offset, limit: limit + 1 })
    return toSearchPage({ items: rows.map(toPublicProfile), offset, limit })
  }

  async posts({ query, cursor, limit }: SearchRequest): Promise<Page<PostView>> {
    const offset = decodeCursor({ cursor, schema: searchCursorSchema })?.offset ?? 0
    const rows = await this.searchRepository.searchPosts({ query, offset, limit: limit + 1 })
    const views = await this.postsService.buildViews(rows)
    return toSearchPage({ items: views, offset, limit })
  }
}
