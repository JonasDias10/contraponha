import { Inject, Injectable } from "@nestjs/common"
import { POST_TOPICS_MAX } from "@contraponha/config"
import {
  getUniqueViolationConstraint,
  runTransaction,
  TOPICS_SLUG_UNIQUE,
  type Database,
  type DatabaseExecutor,
} from "@contraponha/database"
import {
  ApiErrorCode,
  type AdminTopic,
  type Page,
  type TopicList,
  type TopicSummary,
  type TopicView,
} from "@contraponha/types"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import {
  slugifyTopic,
  toAdminTopic,
  toTopicSummary,
  toTopicView,
  type Topic,
} from "#src/modules/topics/domain/topic.js"
import {
  TopicsRepository,
  type CreateTopicData,
  type UpdateTopicParams,
} from "#src/modules/topics/repositories/topics.repository.js"

const topicCursorSchema = z.object({ id: z.uuid() })

export interface ResolveTopicsParams {
  names: readonly string[]
  executor: DatabaseExecutor
}

export interface AttachTopicsParams {
  postId: string
  topics: readonly Topic[]
  executor: DatabaseExecutor
}

export interface ReleaseTopicsParams {
  postId: string
  executor: DatabaseExecutor
}

export interface TopicBySlugParams {
  slug: string
  viewerId?: string
}

export interface FollowTopicParams {
  userId: string
  slug: string
}

export interface FollowTopicsParams {
  userId: string
  slugs: readonly string[]
}

export interface UnfollowAllTopicsParams {
  userId: string
  executor?: DatabaseExecutor
}

export interface TopicReference {
  id: string
  summary: TopicSummary
}

interface ToViewsParams {
  topics: readonly Topic[]
  viewerId?: string
}

export interface SearchTopicsParams {
  q: string
  limit: number
  viewerId?: string
}

export interface ListAllTopicsRequest {
  q?: string
  curated?: boolean
  cursor?: string
  limit: number
}

@Injectable()
export class TopicsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly topicsRepository: TopicsRepository,
  ) {}

  // Turns the names typed in the composer into topics, creating new ones as needed.
  // Names that collapse to the same slug count once; empty slugs are ignored.
  resolveForPost({ names, executor }: ResolveTopicsParams): Promise<Topic[]> {
    const bySlug = new Map<string, string>()

    for (const name of names) {
      const slug = slugifyTopic(name)

      if (slug && !bySlug.has(slug)) bySlug.set(slug, name)
    }

    const data = [...bySlug]
      .slice(0, POST_TOPICS_MAX)
      .map(([slug, name]) => ({ slug, name: name.replace(/^#+/, "").trim() }))

    return this.topicsRepository.ensure({ data, executor })
  }

  attachToPost({ postId, topics, executor }: AttachTopicsParams): Promise<void> {
    return this.topicsRepository.attachToPost({
      postId,
      topicIds: topics.map(({ id }) => id),
      executor,
    })
  }

  releaseFromPost(params: ReleaseTopicsParams): Promise<void> {
    return this.topicsRepository.releaseFromPost(params)
  }

  async summariesForPosts(postIds: readonly string[]): Promise<Map<string, TopicSummary[]>> {
    const rows = await this.topicsRepository.listForPosts(postIds)
    const byPost = new Map<string, TopicSummary[]>()

    for (const { postId, topic } of rows)
      byPost.set(postId, [...(byPost.get(postId) ?? []), toTopicSummary(topic)])

    return byPost
  }

  async listCurated(viewerId?: string): Promise<TopicList> {
    const curated = await this.topicsRepository.listCurated()
    const views = await this.toViews({ topics: curated, viewerId })

    return { topics: views }
  }

  async listFollowed(userId: string): Promise<TopicList> {
    const followed = await this.topicsRepository.listFollowedBy(userId)

    return {
      topics: followed.map((topic) => toTopicView({ topic, isFollowing: true })),
    }
  }

  async followedTopicIds(userId: string): Promise<string[]> {
    const followed = await this.topicsRepository.listFollowedBy(userId)
    return followed.map(({ id }) => id)
  }

  async search({ q, limit, viewerId }: SearchTopicsParams): Promise<TopicView[]> {
    const found = await this.topicsRepository.search({ q, limit })
    return this.toViews({ topics: found, viewerId })
  }

  async getBySlug({ slug, viewerId }: TopicBySlugParams): Promise<TopicView> {
    const topic = await this.requireBySlug(slug)
    const [view] = await this.toViews({ topics: [topic], viewerId })

    if (!view) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return view
  }

  async getReferenceBySlug(slug: string): Promise<TopicReference> {
    const topic = await this.requireBySlug(slug)
    return { id: topic.id, summary: toTopicSummary(topic) }
  }

  async follow({ userId, slug }: FollowTopicParams): Promise<void> {
    const topic = await this.requireBySlug(slug)

    await runTransaction({
      db: this.db,
      work: (tx) => this.topicsRepository.follow({ userId, topicId: topic.id, executor: tx }),
    })
  }

  async unfollow({ userId, slug }: FollowTopicParams): Promise<void> {
    const topic = await this.requireBySlug(slug)

    await runTransaction({
      db: this.db,
      work: (tx) => this.topicsRepository.unfollow({ userId, topicId: topic.id, executor: tx }),
    })
  }

  async followMany({ userId, slugs }: FollowTopicsParams): Promise<TopicList> {
    const found = await this.topicsRepository.findBySlugs(slugs)

    if (found.length !== new Set(slugs).size) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        for (const topic of found)
          await this.topicsRepository.follow({ userId, topicId: topic.id, executor: tx })
      },
    })

    return this.listFollowed(userId)
  }

  async unfollowAll({ userId, executor }: UnfollowAllTopicsParams): Promise<void> {
    if (executor) {
      await this.topicsRepository.unfollowAll({ userId, executor })

      return
    }

    await runTransaction({
      db: this.db,
      work: (tx) => this.topicsRepository.unfollowAll({ userId, executor: tx }),
    })
  }

  private async requireBySlug(slug: string): Promise<Topic> {
    const topic = await this.topicsRepository.findBySlug(slug)

    if (!topic) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return topic
  }

  private async toViews({ topics, viewerId }: ToViewsParams): Promise<TopicView[]> {
    const followed = viewerId
      ? await this.topicsRepository.followedAmong({
          userId: viewerId,
          topicIds: topics.map(({ id }) => id),
        })
      : null

    return topics.map((topic) =>
      toTopicView({ topic, isFollowing: followed ? followed.has(topic.id) : null }),
    )
  }

  async listAll({ q, curated, cursor, limit }: ListAllTopicsRequest): Promise<Page<AdminTopic>> {
    const position = decodeCursor({ cursor, schema: topicCursorSchema })

    const rows = await this.topicsRepository.listAll({
      q,
      isCurated: curated,
      beforeId: position?.id,
      limit: limit + 1,
    })

    return buildPage({ rows, limit, toItem: toAdminTopic, toCursor: ({ id }) => ({ id }) })
  }

  async create(data: CreateTopicData): Promise<AdminTopic> {
    try {
      const topic = await this.topicsRepository.create(data)

      return toAdminTopic(topic)
    } catch (error) {
      if (getUniqueViolationConstraint(error) === TOPICS_SLUG_UNIQUE)
        throw new AppError(ApiErrorCode.CONFLICT, { cause: error, details: { field: "slug" } })

      throw error
    }
  }

  async update(params: UpdateTopicParams): Promise<AdminTopic> {
    const topic = await this.topicsRepository.update(params)

    if (!topic) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return toAdminTopic(topic)
  }
}
