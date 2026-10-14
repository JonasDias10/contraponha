import { Injectable } from "@nestjs/common"
import {
  FeedReasonType,
  type DiscussionList,
  type FeedItem,
  type FeedReason,
  type Page,
  type PostView,
} from "@contraponha/types"
import { z } from "zod"

import { buildPage, decodeCursor, encodeCursor } from "#src/common/pagination/cursor.js"
import {
  mergeCandidates,
  NO_EXCLUSIONS,
  rankDiscover,
  type DiscoverCandidate,
} from "#src/modules/feed/domain/discover-pipeline.js"
import {
  DISCOVER_CANDIDATES_PER_SOURCE,
  FEATURED_MAX_OFFSET,
  ONGOING_DISCUSSIONS_LIMIT,
} from "#src/modules/feed/domain/featured-ranking.js"
import { FeedRepository } from "#src/modules/feed/repositories/feed.repository.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"
import { TopicsService } from "#src/modules/topics/services/topics.service.js"
import { toPublicProfile } from "#src/modules/users/domain/user.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const idCursorSchema = z.object({ id: z.uuid() })

const activityCursorSchema = z.object({ at: z.iso.datetime(), id: z.uuid() })

const offsetCursorSchema = z.object({
  offset: z.coerce.number().int().min(0).max(FEATURED_MAX_OFFSET),
})

export interface FollowingFeedParams {
  userId: string
  cursor: string | undefined
  limit: number
}

export interface DiscoverFeedParams {
  viewerId: string | undefined
  cursor: string | undefined
  limit: number
}

export interface TopicFeedParams {
  slug: string
  viewerId: string | undefined
  cursor: string | undefined
  limit: number
}

interface DiscoverReasonParams {
  post: PostView
  matchedTopicSlug: string | null
}

function discoverReason({ post, matchedTopicSlug }: DiscoverReasonParams): FeedReason {
  const topic = post.topics.find(({ slug }) => slug === matchedTopicSlug)

  return topic
    ? { type: FeedReasonType.FOLLOWED_TOPIC, topic }
    : { type: FeedReasonType.FEATURED, topic: null }
}

interface ChronologicalPageParams {
  views: PostView[]
  limit: number
}

@Injectable()
export class FeedService {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly postsService: PostsService,
    private readonly topicsService: TopicsService,
    private readonly usersService: UsersService,
  ) {}

  // Pages by activity (when a post was published or reposted). A post shared by several
  // people shows once per page, at its most recent activity.
  async following({ userId, cursor, limit }: FollowingFeedParams): Promise<Page<FeedItem>> {
    const position = decodeCursor({ cursor, schema: activityCursorSchema })

    const activities = await this.feedRepository.listFollowing({
      userId,
      before: position ? { at: new Date(position.at), id: position.id } : undefined,
      limit: limit + 1,
    })

    const page = activities.slice(0, limit)
    const last = page.at(-1)

    const unique = page.filter(
      (activity, index) => page.findIndex(({ postId }) => postId === activity.postId) === index,
    )

    const posts = await this.postsService.findByIds(unique.map(({ postId }) => postId))
    const postsById = new Map(posts.map((post) => [post.id, post]))
    const rows = unique.flatMap(({ postId }) => postsById.get(postId) ?? [])
    const views = await this.postsService.buildViews({ rows, viewerId: userId })
    const viewsById = new Map(views.map((view) => [view.id, view]))

    const reposters = await this.usersService.findByIds(
      unique.flatMap(({ reposterId }) => (reposterId ? [reposterId] : [])),
    )

    const items = unique.flatMap(({ postId, reposterId }): FeedItem[] => {
      const post = viewsById.get(postId)
      const reposter = reposterId ? reposters.get(reposterId) : undefined

      return post
        ? [{ post, reason: null, repostedBy: reposter ? toPublicProfile(reposter) : null }]
        : []
    })

    const hasMore = activities.length > limit && last !== undefined

    return {
      items,
      nextCursor: hasMore ? encodeCursor({ at: last.at.toISOString(), id: last.activityId }) : null,
    }
  }

  // Scores change between requests, so this feed pages by offset and stops at a cap.
  async discover({ viewerId, cursor, limit }: DiscoverFeedParams): Promise<Page<FeedItem>> {
    const offset = decodeCursor({ cursor, schema: offsetCursorSchema })?.offset ?? 0
    const candidates = await this.discoverCandidates(viewerId)

    const exclusions = viewerId
      ? await this.feedRepository.listViewerExclusions({ viewerId, candidates })
      : NO_EXCLUSIONS

    const ranked = rankDiscover({ candidates, viewerId, exclusions }).slice(
      offset,
      offset + limit + 1,
    )

    const posts = await this.postsService.findByIds(ranked.map(({ postId }) => postId))
    const postsById = new Map(posts.map((post) => [post.id, post]))
    const rows = ranked.flatMap(({ postId }) => postsById.get(postId) ?? [])
    const views = await this.postsService.buildViews({ rows, viewerId })
    const matchedTopics = new Map(ranked.map((item) => [item.postId, item.matchedTopicSlug]))

    const items = views.map((post): FeedItem => ({
      post,
      reason: discoverReason({ post, matchedTopicSlug: matchedTopics.get(post.id) ?? null }),
      repostedBy: null,
    }))

    const nextOffset = offset + limit

    const page = buildPage({
      rows: items,
      limit,
      toItem: (item) => item,
      toCursor: () => ({ offset: String(nextOffset) }),
    })

    return nextOffset > FEATURED_MAX_OFFSET ? { ...page, nextCursor: null } : page
  }

  async topic({ slug, viewerId, cursor, limit }: TopicFeedParams): Promise<Page<FeedItem>> {
    const topic = await this.topicsService.getReferenceBySlug(slug)
    const position = decodeCursor({ cursor, schema: idCursorSchema })

    const rows = await this.feedRepository.listByTopic({
      topicId: topic.id,
      viewerId,
      beforeId: position?.id,
      limit: limit + 1,
    })

    const views = await this.postsService.buildViews({ rows, viewerId })
    return this.chronologicalPage({ views, limit })
  }

  async ongoingDiscussions(): Promise<DiscussionList> {
    const rows = await this.feedRepository.listOngoingDiscussions(ONGOING_DISCUSSIONS_LIMIT)

    return {
      discussions: rows.flatMap((post) =>
        post.title
          ? [
              {
                postId: post.id,
                title: post.title,
                commentCount: post.commentCount,
                highlightedCommentCount: post.highlightedCommentCount,
              },
            ]
          : [],
      ),
    }
  }

  // Followed topics come first so their copy of a post, which explains the pick, wins.
  private async discoverCandidates(viewerId: string | undefined): Promise<DiscoverCandidate[]> {
    const limit = DISCOVER_CANDIDATES_PER_SOURCE

    const [followedTopics, quality] = await Promise.all([
      viewerId
        ? this.feedRepository.listFollowedTopicCandidates({ viewerId, limit })
        : Promise.resolve([]),
      this.feedRepository.listQualityCandidates({ viewerId, limit }),
    ])

    return mergeCandidates([followedTopics, quality])
  }

  private chronologicalPage({ views, limit }: ChronologicalPageParams): Page<FeedItem> {
    return buildPage({
      rows: views,
      limit,
      toItem: (post): FeedItem => ({ post, reason: null, repostedBy: null }),
      toCursor: (post) => ({ id: post.id }),
    })
  }
}
