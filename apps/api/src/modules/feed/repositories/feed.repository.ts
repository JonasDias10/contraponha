import { daysToMs } from "@ponto/config"
import { Inject, Injectable } from "@nestjs/common"
import { follows, postTopics, posts, topicFollows, topics, type Database } from "@ponto/database"
import { and, desc, eq, gt, inArray, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm"

import { FEED_FEATURED_WINDOW_DAYS } from "#src/config/durations.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import {
  FEATURED_AGE_OFFSET_HOURS,
  FEATURED_GRAVITY,
  FEATURED_WEIGHTS,
  FOLLOWED_TOPIC_BOOST,
} from "#src/modules/feed/domain/featured-ranking.js"
import type { Post } from "#src/modules/posts/domain/post.js"

export interface ListFollowingFeedParams {
  userId: string
  beforeId: string | undefined
  limit: number
}

export interface ListDiscoverParams {
  viewerId: string | undefined
  offset: number
  limit: number
}

export interface DiscoverRow {
  post: Post
  matchedTopicSlug: string | null
}

export interface ListTopicPostsParams {
  topicId: string
  beforeId: string | undefined
  limit: number
}

const qualityScore = sql`
  (1
    + ${FEATURED_WEIGHTS.goodArgument} * ${posts.goodArgumentCount}
    + ${FEATURED_WEIGHTS.changedMyMind} * ${posts.changedMyMindCount}
    + ${FEATURED_WEIGHTS.insightful} * ${posts.insightfulCount}
    + ${FEATURED_WEIGHTS.comment} * ${posts.commentCount})
  / power(
    extract(epoch from (now() - ${posts.createdAt})) / 3600 + ${FEATURED_AGE_OFFSET_HOURS},
    ${FEATURED_GRAVITY}
  )
`

function windowStart(): Date {
  return new Date(Date.now() - daysToMs(FEED_FEATURED_WINDOW_DAYS))
}

// Read model: joins tables owned by posts, follows and topics for reads only; writes stay
// with the owners.
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

  // Recent posts by quality with time decay. For a signed-in reader, posts in topics they
  // follow are boosted and the matching topic is returned to explain the recommendation.
  listDiscover({ viewerId, offset, limit }: ListDiscoverParams): Promise<DiscoverRow[]> {
    const firstFollowedTopic = viewerId
      ? this.db
          .select({ slug: topics.slug })
          .from(postTopics)
          .innerJoin(topics, eq(topics.id, postTopics.topicId))
          .innerJoin(
            topicFollows,
            and(eq(topicFollows.topicId, postTopics.topicId), eq(topicFollows.userId, viewerId)),
          )
          .where(eq(postTopics.postId, posts.id))
          .orderBy(postTopics.position)
          .limit(1)
      : undefined

    const matchedTopicSlug: SQL<string | null> = firstFollowedTopic
      ? sql<string | null>`(${firstFollowedTopic})`
      : sql<string | null>`null::text`

    const score = viewerId
      ? sql`${qualityScore} * (case when ${matchedTopicSlug} is null then 1 else ${FOLLOWED_TOPIC_BOOST} end)`
      : qualityScore

    return this.db
      .select({ post: posts, matchedTopicSlug })
      .from(posts)
      .where(
        and(
          isNull(posts.deletedAt),
          gt(posts.createdAt, windowStart()),
          viewerId ? sql`${posts.authorId} <> ${viewerId}` : undefined,
        ),
      )
      .orderBy(desc(score), desc(posts.id))
      .offset(offset)
      .limit(limit)
  }

  listByTopic({ topicId, beforeId, limit }: ListTopicPostsParams): Promise<Post[]> {
    return this.db
      .select({ post: posts })
      .from(postTopics)
      .innerJoin(posts, eq(posts.id, postTopics.postId))
      .where(
        and(
          eq(postTopics.topicId, topicId),
          isNull(posts.deletedAt),
          beforeId ? lt(posts.id, beforeId) : undefined,
        ),
      )
      .orderBy(desc(posts.id))
      .limit(limit)
      .then((rows) => rows.map(({ post }) => post))
  }

  // Titled posts from the recent window with the liveliest discussions.
  listOngoingDiscussions(limit: number): Promise<Post[]> {
    return this.db
      .select()
      .from(posts)
      .where(
        and(
          isNull(posts.deletedAt),
          isNotNull(posts.title),
          gt(posts.createdAt, windowStart()),
          gt(posts.commentCount, 0),
        ),
      )
      .orderBy(desc(posts.commentCount), desc(posts.highlightedCommentCount), desc(posts.id))
      .limit(limit)
  }
}
