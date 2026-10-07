import { daysToMs } from "@ponto/config"
import { Inject, Injectable } from "@nestjs/common"
import {
  follows,
  postTopics,
  posts,
  reports,
  topicFollows,
  topics,
  type Database,
} from "@ponto/database"
import {
  and,
  desc,
  eq,
  exists,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm"

import { FEED_FEATURED_WINDOW_DAYS } from "#src/config/durations.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import {
  NO_EXCLUSIONS,
  type DiscoverCandidate,
  type ViewerExclusions,
} from "#src/modules/feed/domain/discover-pipeline.js"
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

export interface ListFollowedTopicCandidatesParams {
  viewerId: string
  limit: number
}

export interface ListViewerExclusionsParams {
  viewerId: string
  candidates: readonly DiscoverCandidate[]
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

const candidateColumns = {
  postId: posts.id,
  authorId: posts.authorId,
  qualityScore: sql<number>`${qualityScore}`.mapWith(Number),
}

function windowStart(): Date {
  return new Date(Date.now() - daysToMs(FEED_FEATURED_WINDOW_DAYS))
}

function recentActivePost(): SQL | undefined {
  return and(isNull(posts.deletedAt), gt(posts.createdAt, windowStart()))
}

// Read model: joins tables owned by posts, follows, topics and moderation for reads only;
// writes stay with the owners.
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

  // Source: the best recent posts by quality with time decay, whatever their topic.
  listQualityCandidates(limit: number): Promise<DiscoverCandidate[]> {
    return this.db
      .select({ ...candidateColumns, matchedTopicSlug: sql<string | null>`null::text` })
      .from(posts)
      .where(recentActivePost())
      .orderBy(desc(qualityScore), desc(posts.id))
      .limit(limit)
  }

  // Source: the best recent posts in topics the viewer follows, with the first such topic
  // to explain the recommendation.
  listFollowedTopicCandidates({
    viewerId,
    limit,
  }: ListFollowedTopicCandidatesParams): Promise<DiscoverCandidate[]> {
    const firstFollowedTopic = this.db
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

    return this.db
      .select({
        ...candidateColumns,
        matchedTopicSlug: sql<string | null>`(${firstFollowedTopic})`,
      })
      .from(posts)
      .where(and(recentActivePost(), exists(firstFollowedTopic)))
      .orderBy(desc(qualityScore), desc(posts.id))
      .limit(limit)
  }

  async listViewerExclusions({
    viewerId,
    candidates,
  }: ListViewerExclusionsParams): Promise<ViewerExclusions> {
    if (candidates.length === 0) return NO_EXCLUSIONS

    const rows = await this.db
      .select({ postId: reports.postId, targetUserId: reports.targetUserId })
      .from(reports)
      .where(
        and(
          eq(reports.reporterId, viewerId),
          or(
            inArray(
              reports.postId,
              candidates.map(({ postId }) => postId),
            ),
            inArray(
              reports.targetUserId,
              candidates.map(({ authorId }) => authorId),
            ),
          ),
        ),
      )

    return {
      postIds: new Set(rows.flatMap(({ postId }) => (postId ? [postId] : []))),
      authorIds: new Set(rows.flatMap(({ targetUserId }) => (targetUserId ? [targetUserId] : []))),
    }
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
      .where(and(recentActivePost(), isNotNull(posts.title), gt(posts.commentCount, 0)))
      .orderBy(desc(posts.commentCount), desc(posts.highlightedCommentCount), desc(posts.id))
      .limit(limit)
  }
}
