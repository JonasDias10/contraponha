import type { ContentRevisionList, Page, PostView } from "@ponto/types"
import {
  contentRevisionListSchema,
  postPageSchema,
  postViewSchema,
  type CreatePostInput,
  type PaginationQuery,
  type UpdatePostInput,
} from "@ponto/validation"

import { emptyResponseSchema, withQuery, type HttpClient } from "../http.js"

export interface UpdatePostRequest {
  postId: string
  input: UpdatePostInput
}

export interface ListUserPostsRequest {
  handle: string
  query?: PaginationQuery
}

export interface PostsResource {
  create(input: CreatePostInput): Promise<PostView>
  get(postId: string): Promise<PostView>
  update(request: UpdatePostRequest): Promise<PostView>
  delete(postId: string): Promise<void>
  listRevisions(postId: string): Promise<ContentRevisionList>
  listByUser(request: ListUserPostsRequest): Promise<Page<PostView>>
}

export function createPostsResource(request: HttpClient): PostsResource {
  return {
    create: (input) =>
      request({ method: "POST", path: "/posts", body: input, schema: postViewSchema }),
    get: (postId) =>
      request({
        method: "GET",
        path: `/posts/${encodeURIComponent(postId)}`,
        schema: postViewSchema,
      }),
    update: ({ postId, input }) =>
      request({
        method: "PATCH",
        path: `/posts/${encodeURIComponent(postId)}`,
        body: input,
        schema: postViewSchema,
      }),
    delete: async (postId) => {
      await request({
        method: "DELETE",
        path: `/posts/${encodeURIComponent(postId)}`,
        schema: emptyResponseSchema,
      })
    },
    listRevisions: (postId) =>
      request({
        method: "GET",
        path: `/posts/${encodeURIComponent(postId)}/revisions`,
        schema: contentRevisionListSchema,
      }),
    listByUser: ({ handle, query = {} }) =>
      request({
        method: "GET",
        path: withQuery({ path: `/users/${encodeURIComponent(handle)}/posts`, query }),
        schema: postPageSchema,
      }),
  }
}
