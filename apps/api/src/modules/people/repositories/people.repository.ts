import { Inject, Injectable } from "@nestjs/common"
import {
  comments,
  type Database,
  follows,
  isVisibleAuthor,
  posts,
  postTopics,
  topicFollows,
  type TopicRow,
  topics,
  type UserRow,
  users,
} from "@contraponha/database"
import { and, count, desc, eq, gt, inArray, isNull, ne, notInArray, sql } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { ReceivedReactions } from "#src/modules/people/domain/recognition.js"

export interface TopTopicsParams {
  userId: string
  limit: number
}

export interface FollowedByParams {
  viewerId: string
  userId: string
  limit: number
}

export interface FollowedByRows {
  people: UserRow[]
  total: number
}

export interface FollowStateParams {
  viewerId: string
  userId: string
}

export interface FollowState {
  isFollowing: boolean
  isFollowedBy: boolean
}

export interface SuggestParams {
  viewerId: string
  since: Date
  limit: number
}

const qualityOnPosts = sql<number>`coalesce(sum(${posts.goodArgumentCount} + ${posts.insightfulCount}), 0)::int`

// Read model for profiles and suggestions: reads posts, comments, follows and topics, which
// belong to other modules, and never writes to them.
@Injectable()
export class PeopleRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async receivedReactions(userId: string): Promise<ReceivedReactions> {
    const [onPosts] = await this.db
      .select({
        goodArgument: sql<number>`coalesce(sum(${posts.goodArgumentCount}), 0)::int`,
        insightful: sql<number>`coalesce(sum(${posts.insightfulCount}), 0)::int`,
      })
      .from(posts)
      .where(and(eq(posts.authorId, userId), isNull(posts.deletedAt)))

    const [onComments] = await this.db
      .select({
        goodArgument: sql<number>`coalesce(sum(${comments.goodArgumentCount}), 0)::int`,
        insightful: sql<number>`coalesce(sum(${comments.insightfulCount}), 0)::int`,
      })
      .from(comments)
      .where(and(eq(comments.authorId, userId), isNull(comments.deletedAt)))

    return {
      goodArgument: (onPosts?.goodArgument ?? 0) + (onComments?.goodArgument ?? 0),
      insightful: (onPosts?.insightful ?? 0) + (onComments?.insightful ?? 0),
    }
  }

  // Topics where the person's posts earned the most quality reactions.
  recognizedTopics({ userId, limit }: TopTopicsParams): Promise<TopicRow[]> {
    return this.db
      .select({ topic: topics })
      .from(postTopics)
      .innerJoin(posts, eq(posts.id, postTopics.postId))
      .innerJoin(topics, eq(topics.id, postTopics.topicId))
      .where(and(eq(posts.authorId, userId), isNull(posts.deletedAt)))
      .groupBy(topics.id)
      .having(gt(qualityOnPosts, 0))
      .orderBy(desc(qualityOnPosts))
      .limit(limit)
      .then((rows) => rows.map(({ topic }) => topic))
  }

  // Topics the person writes about most.
  writesAbout({ userId, limit }: TopTopicsParams): Promise<TopicRow[]> {
    return this.db
      .select({ topic: topics })
      .from(postTopics)
      .innerJoin(posts, eq(posts.id, postTopics.postId))
      .innerJoin(topics, eq(topics.id, postTopics.topicId))
      .where(and(eq(posts.authorId, userId), isNull(posts.deletedAt)))
      .groupBy(topics.id)
      .orderBy(desc(count()), topics.slug)
      .limit(limit)
      .then((rows) => rows.map(({ topic }) => topic))
  }

  async followState({ viewerId, userId }: FollowStateParams): Promise<FollowState> {
    const rows = await this.db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(
        sql`(${follows.followerId} = ${viewerId} and ${follows.followeeId} = ${userId})
          or (${follows.followerId} = ${userId} and ${follows.followeeId} = ${viewerId})`,
      )

    return {
      isFollowing: rows.some(({ followerId }) => followerId === viewerId),
      isFollowedBy: rows.some(({ followerId }) => followerId === userId),
    }
  }

  // People the viewer follows who also follow userId.
  async followedBy({ viewerId, userId, limit }: FollowedByParams): Promise<FollowedByRows> {
    const viewerFollows = this.db
      .select({ id: follows.followeeId })
      .from(follows)
      .where(eq(follows.followerId, viewerId))

    const condition = and(
      eq(follows.followeeId, userId),
      inArray(follows.followerId, viewerFollows),
    )

    const people = await this.db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followerId))
      .where(condition)
      .orderBy(desc(users.followerCount))
      .limit(limit)

    const [total] = await this.db.select({ value: count() }).from(follows).where(condition)

    return { people: people.map(({ user }) => user), total: total?.value ?? 0 }
  }

  // People whose recent posts in the viewer's topics earned quality reactions, excluding
  // people already followed. With no followed topics, every topic counts.
  async suggest({ viewerId, since, limit }: SuggestParams): Promise<UserRow[]> {
    const followedTopicIds = this.db
      .select({ id: topicFollows.topicId })
      .from(topicFollows)
      .where(eq(topicFollows.userId, viewerId))

    const followedUserIds = this.db
      .select({ id: follows.followeeId })
      .from(follows)
      .where(eq(follows.followerId, viewerId))

    const [topicCount] = await this.db
      .select({ value: count() })
      .from(topicFollows)
      .where(eq(topicFollows.userId, viewerId))

    const hasTopics = (topicCount?.value ?? 0) > 0

    const rows = await this.db
      .select({ user: users, score: qualityOnPosts })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .where(
        and(
          isNull(posts.deletedAt),
          isNull(users.deletedAt),
          gt(posts.createdAt, since),
          ne(posts.authorId, viewerId),
          notInArray(posts.authorId, followedUserIds),
          isVisibleAuthor({ column: posts.authorId, viewerId }),
          hasTopics
            ? inArray(
                posts.id,
                this.db
                  .select({ id: postTopics.postId })
                  .from(postTopics)
                  .where(inArray(postTopics.topicId, followedTopicIds)),
              )
            : undefined,
        ),
      )
      .groupBy(users.id)
      .having(gt(qualityOnPosts, 0))
      .orderBy(desc(qualityOnPosts), users.id)
      .limit(limit)

    return rows.map(({ user }) => user)
  }
}
