import { Inject, Injectable } from "@nestjs/common"
import {
  postTopics,
  topicFollows,
  topics,
  type Database,
  type DatabaseExecutor,
} from "@contraponha/database"
import { and, asc, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { Topic } from "#src/modules/topics/domain/topic.js"

export interface NewTopicData {
  slug: string
  name: string
}

export interface EnsureTopicsParams {
  data: readonly NewTopicData[]
  executor: DatabaseExecutor
}

export interface AttachTopicsParams {
  postId: string
  topicIds: readonly string[]
  executor: DatabaseExecutor
}

export interface DetachTopicsParams {
  postId: string
  executor: DatabaseExecutor
}

export interface TopicFollowParams {
  userId: string
  topicId: string
  executor: DatabaseExecutor
}

export interface UnfollowAllParams {
  userId: string
  executor: DatabaseExecutor
}

export interface FollowedAmongParams {
  userId: string
  topicIds: readonly string[]
}

export interface PostTopicRow {
  postId: string
  topic: Topic
}

export interface SearchTopicsParams {
  q: string
  limit: number
}

export interface ListAllTopicsParams {
  q: string | undefined
  isCurated: boolean | undefined
  beforeId: string | undefined
  limit: number
}

export interface CreateTopicData {
  slug: string
  name: string
  isCurated: boolean
}

export interface UpdateTopicParams {
  slug: string
  data: Partial<Pick<Topic, "name" | "isCurated">>
  executor?: DatabaseExecutor
}

@Injectable()
export class TopicsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findBySlug(slug: string): Promise<Topic | undefined> {
    const [topic] = await this.db.select().from(topics).where(eq(topics.slug, slug))
    return topic
  }

  findBySlugs(slugs: readonly string[]): Promise<Topic[]> {
    if (slugs.length === 0) return Promise.resolve([])

    return this.db
      .select()
      .from(topics)
      .where(inArray(topics.slug, [...slugs]))
  }

  listCurated(): Promise<Topic[]> {
    return this.db.select().from(topics).where(eq(topics.isCurated, true)).orderBy(asc(topics.slug))
  }

  listFollowedBy(userId: string): Promise<Topic[]> {
    return this.db
      .select({ topic: topics })
      .from(topicFollows)
      .innerJoin(topics, eq(topics.id, topicFollows.topicId))
      .where(eq(topicFollows.userId, userId))
      .orderBy(asc(topics.slug))
      .then((rows) => rows.map(({ topic }) => topic))
  }

  async followedAmong({ userId, topicIds }: FollowedAmongParams): Promise<Set<string>> {
    if (topicIds.length === 0) return new Set()

    const rows = await this.db
      .select({ topicId: topicFollows.topicId })
      .from(topicFollows)
      .where(and(eq(topicFollows.userId, userId), inArray(topicFollows.topicId, [...topicIds])))

    return new Set(rows.map(({ topicId }) => topicId))
  }

  search({ q, limit }: SearchTopicsParams): Promise<Topic[]> {
    return this.db
      .select()
      .from(topics)
      .where(sql`${topics.name} % ${q} or ${topics.slug} like ${`${q}%`}`)
      .orderBy(desc(topics.postCount), desc(sql`similarity(${topics.name}, ${q})`))
      .limit(limit)
  }

  // Creates the topics that do not exist yet and returns all of them, in input order.
  async ensure({ data, executor }: EnsureTopicsParams): Promise<Topic[]> {
    if (data.length === 0) return []

    await executor
      .insert(topics)
      .values([...data])
      .onConflictDoNothing({ target: topics.slug })

    const rows = await executor
      .select()
      .from(topics)
      .where(
        inArray(
          topics.slug,
          data.map(({ slug }) => slug),
        ),
      )

    const bySlug = new Map(rows.map((topic) => [topic.slug, topic]))
    return data.flatMap(({ slug }) => bySlug.get(slug) ?? [])
  }

  async attachToPost({ postId, topicIds, executor }: AttachTopicsParams): Promise<void> {
    if (topicIds.length === 0) return

    await executor
      .insert(postTopics)
      .values(topicIds.map((topicId, position) => ({ postId, topicId, position })))

    await executor
      .update(topics)
      .set({ postCount: sql`${topics.postCount} + 1` })
      .where(inArray(topics.id, [...topicIds]))
  }

  // Post topics stay linked (they describe the removed post in the audit trail); only the
  // public count goes down.
  async releaseFromPost({ postId, executor }: DetachTopicsParams): Promise<void> {
    await executor
      .update(topics)
      .set({ postCount: sql`${topics.postCount} - 1` })
      .where(
        inArray(
          topics.id,
          executor
            .select({ topicId: postTopics.topicId })
            .from(postTopics)
            .where(eq(postTopics.postId, postId)),
        ),
      )
  }

  async listForPosts(postIds: readonly string[]): Promise<PostTopicRow[]> {
    if (postIds.length === 0) return []

    return this.db
      .select({ postId: postTopics.postId, topic: topics })
      .from(postTopics)
      .innerJoin(topics, eq(topics.id, postTopics.topicId))
      .where(inArray(postTopics.postId, [...postIds]))
      .orderBy(asc(postTopics.position))
  }

  async follow({ userId, topicId, executor }: TopicFollowParams): Promise<boolean> {
    const inserted = await executor
      .insert(topicFollows)
      .values({ userId, topicId })
      .onConflictDoNothing()
      .returning({ topicId: topicFollows.topicId })

    if (inserted.length === 0) return false

    await executor
      .update(topics)
      .set({ followerCount: sql`${topics.followerCount} + 1` })
      .where(eq(topics.id, topicId))

    return true
  }

  async unfollow({ userId, topicId, executor }: TopicFollowParams): Promise<boolean> {
    const removed = await executor
      .delete(topicFollows)
      .where(and(eq(topicFollows.userId, userId), eq(topicFollows.topicId, topicId)))
      .returning({ topicId: topicFollows.topicId })

    if (removed.length === 0) return false

    await executor
      .update(topics)
      .set({ followerCount: sql`${topics.followerCount} - 1` })
      .where(eq(topics.id, topicId))

    return true
  }

  async unfollowAll({ userId, executor }: UnfollowAllParams): Promise<void> {
    const removed = await executor
      .delete(topicFollows)
      .where(eq(topicFollows.userId, userId))
      .returning({ topicId: topicFollows.topicId })

    if (removed.length === 0) return

    await executor
      .update(topics)
      .set({ followerCount: sql`${topics.followerCount} - 1` })
      .where(
        inArray(
          topics.id,
          removed.map(({ topicId }) => topicId),
        ),
      )
  }

  listAll({ q, isCurated, beforeId, limit }: ListAllTopicsParams): Promise<Topic[]> {
    const pattern = q ? `%${q}%` : undefined

    return this.db
      .select()
      .from(topics)
      .where(
        and(
          pattern ? or(ilike(topics.name, pattern), ilike(topics.slug, pattern)) : undefined,
          isCurated === undefined ? undefined : eq(topics.isCurated, isCurated),
          beforeId ? lt(topics.id, beforeId) : undefined,
        ),
      )
      .orderBy(desc(topics.id))
      .limit(limit)
  }

  async create(data: CreateTopicData): Promise<Topic> {
    const [topic] = await this.db.insert(topics).values(data).returning()

    if (!topic) throw new Error("Insert into topics returned no row")

    return topic
  }

  async update({ slug, data, executor = this.db }: UpdateTopicParams): Promise<Topic | undefined> {
    const [topic] = await executor.update(topics).set(data).where(eq(topics.slug, slug)).returning()

    return topic
  }
}
