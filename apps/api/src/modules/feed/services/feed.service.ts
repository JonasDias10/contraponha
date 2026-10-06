import { Injectable } from "@nestjs/common"
import type { Page, PostView } from "@ponto/types"
import { z } from "zod"

import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { FEATURED_MAX_OFFSET } from "#src/modules/feed/domain/featured-ranking.js"
import { FeedRepository } from "#src/modules/feed/repositories/feed.repository.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"

const followingCursorSchema = z.object({ id: z.uuid() })

const featuredCursorSchema = z.object({
  offset: z.coerce.number().int().min(0).max(FEATURED_MAX_OFFSET),
})

export interface FollowingFeedParams {
  userId: string
  cursor: string | undefined
  limit: number
}

export interface FeaturedFeedParams {
  cursor: string | undefined
  limit: number
}

@Injectable()
export class FeedService {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly postsService: PostsService,
  ) {}

  async following({ userId, cursor, limit }: FollowingFeedParams): Promise<Page<PostView>> {
    const position = decodeCursor({ cursor, schema: followingCursorSchema })

    const rows = await this.feedRepository.listFollowing({
      userId,
      beforeId: position?.id,
      limit: limit + 1,
    })

    const views = await this.postsService.buildViews(rows)

    return buildPage({
      rows: views,
      limit,
      toItem: (view) => view,
      toCursor: (view) => ({ id: view.id }),
    })
  }

  // Scores change between requests, so the featured feed pages by offset and stops at a cap.
  async featured({ cursor, limit }: FeaturedFeedParams): Promise<Page<PostView>> {
    const offset = decodeCursor({ cursor, schema: featuredCursorSchema })?.offset ?? 0
    const rows = await this.feedRepository.listFeatured({ offset, limit: limit + 1 })
    const views = await this.postsService.buildViews(rows)
    const nextOffset = offset + limit

    const page = buildPage({
      rows: views,
      limit,
      toItem: (view) => view,
      toCursor: () => ({ offset: String(nextOffset) }),
    })

    return nextOffset > FEATURED_MAX_OFFSET ? { ...page, nextCursor: null } : page
  }
}
