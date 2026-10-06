import { createHttpClient, type HttpClientOptions } from "./http.js"
import { createAuthResource, type AuthResource } from "./resources/auth.js"
import { createCommentsResource, type CommentsResource } from "./resources/comments.js"
import { createFeedResource, type FeedResource } from "./resources/feed.js"
import { createFollowsResource, type FollowsResource } from "./resources/follows.js"
import { createHealthResource, type HealthResource } from "./resources/health.js"
import { createMediaResource, type MediaResource } from "./resources/media.js"
import { createModerationResource, type ModerationResource } from "./resources/moderation.js"
import {
  createNotificationsResource,
  type NotificationsResource,
} from "./resources/notifications.js"
import { createPostsResource, type PostsResource } from "./resources/posts.js"
import { createReactionsResource, type ReactionsResource } from "./resources/reactions.js"
import { createSearchResource, type SearchResource } from "./resources/search.js"
import { createUsersResource, type UsersResource } from "./resources/users.js"

export type ApiClientOptions = HttpClientOptions

export interface ApiClient {
  auth: AuthResource
  comments: CommentsResource
  feed: FeedResource
  follows: FollowsResource
  health: HealthResource
  media: MediaResource
  moderation: ModerationResource
  notifications: NotificationsResource
  posts: PostsResource
  reactions: ReactionsResource
  search: SearchResource
  users: UsersResource
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const request = createHttpClient(options)

  return {
    auth: createAuthResource(request),
    comments: createCommentsResource(request),
    feed: createFeedResource(request),
    follows: createFollowsResource(request),
    health: createHealthResource(request),
    media: createMediaResource(request),
    moderation: createModerationResource(request),
    notifications: createNotificationsResource(request),
    posts: createPostsResource(request),
    reactions: createReactionsResource(request),
    search: createSearchResource(request),
    users: createUsersResource(request),
  }
}
