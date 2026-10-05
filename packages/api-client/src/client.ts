import { createHttpClient, type HttpClientOptions } from "./http.js"
import { createAuthResource, type AuthResource } from "./resources/auth.js"
import { createCommentsResource, type CommentsResource } from "./resources/comments.js"
import { createFollowsResource, type FollowsResource } from "./resources/follows.js"
import { createHealthResource, type HealthResource } from "./resources/health.js"
import { createPostsResource, type PostsResource } from "./resources/posts.js"
import { createReactionsResource, type ReactionsResource } from "./resources/reactions.js"
import { createUsersResource, type UsersResource } from "./resources/users.js"

export type ApiClientOptions = HttpClientOptions

export interface ApiClient {
  auth: AuthResource
  comments: CommentsResource
  follows: FollowsResource
  health: HealthResource
  posts: PostsResource
  reactions: ReactionsResource
  users: UsersResource
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const request = createHttpClient(options)

  return {
    auth: createAuthResource(request),
    comments: createCommentsResource(request),
    follows: createFollowsResource(request),
    health: createHealthResource(request),
    posts: createPostsResource(request),
    reactions: createReactionsResource(request),
    users: createUsersResource(request),
  }
}
