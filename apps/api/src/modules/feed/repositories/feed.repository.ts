import { daysToMs } from "@ponto/config"
import { Inject, Injectable } from "@nestjs/common"
import { follows, posts, type Database } from "@ponto/database"
import { and, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm"

import { FEED_FEATURED_WINDOW_DAYS } from "#src/config/durations.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import {
  FEATURED_AGE_OFFSET_HOURS,
  FEATURED_GRAVITY,
  FEATURED_WEIGHTS,
} from "#src/modules/feed/domain/featured-ranking.js"
import type { Post } from "#src/modules/posts/domain/post.js"

export interface ListFollowingFeedParams {
  userId: string
  beforeId: string | undefined
  limit: number
}

export interface ListFeaturedParams {
  offset: number
  limit: number
}

const featuredScore = sql`
  (1
    + ${FEATURED_WEIGHTS.goodArgument} * ${posts.goodArgumentCount}
    + ${FEATURED_WEIGHTS.insightful} * ${posts.insightfulCount}
    + ${FEATURED_WEIGHTS.comment} * ${posts.commentCount})
  / power(
    extract(epoch from (now() - ${posts.createdAt})) / 3600 + ${FEATURED_AGE_OFFSET_HOURS},
    ${FEATURED_GRAVITY}
  )
`

// Read model: joins tables owned by posts and follows for reads only; writes stay with the owners.
@Injectable()
export class FeedRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  listFollowing({ userId, beforeId, limit }: ListFollowingFeedParams): Promise<Post[]> {
    const followedAuthors = this.db
      .select({ id: follows.followeeId })
      .from(follows)
      .where(eq(follows.followerId, userId))

    return this.db
      .select()
      .from(posts)
      .where(
        and(
          isNull(posts.deletedAt),
          or(eq(posts.authorId, userId), inArray(posts.authorId, followedAuthors)),
          beforeId ? lt(posts.id, beforeId) : undefined,
        ),
      )
      .orderBy(desc(posts.id))
      .limit(limit)
  }

  listFeatured({ offset, limit }: ListFeaturedParams): Promise<Post[]> {
    const windowStart = new Date(Date.now() - daysToMs(FEED_FEATURED_WINDOW_DAYS))

    return this.db
      .select()
      .from(posts)
      .where(and(isNull(posts.deletedAt), gt(posts.createdAt, windowStart)))
      .orderBy(desc(featuredScore), desc(posts.id))
      .offset(offset)
      .limit(limit)
  }
}
