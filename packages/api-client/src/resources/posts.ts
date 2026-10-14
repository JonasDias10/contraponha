import type { BookmarkCount, ContentRevisionList, Page, PostView } from "@contraponha/types"
import {
  bookmarkCountSchema,
  contentRevisionListSchema,
  postPageSchema,
  postViewSchema,
  type CreatePostInput,
  type PaginationQuery,
  type UpdatePostInput,
} from "@contraponha/validation"

import { emptyResponseSchema, withQuery, type HttpClient } from "../http.js"

export interface UpdatePostRequest {
  postId: string
  input: UpdatePostInput
}

export interface ListUserPostsRequest {
  handle: string
  query?: PaginationQuery
}

export interface ListQuotesRequest {
  postId: string
  query?: PaginationQuery
}

export interface PostsResource {
  create(input: CreatePostInput): Promise<PostView>
  get(postId: string): Promise<PostView>
  update(request: UpdatePostRequest): Promise<PostView>
  delete(postId: string): Promise<void>
  listRevisions(postId: string): Promise<ContentRevisionList>
  listByUser(request: ListUserPostsRequest): Promise<Page<PostView>>
  pin(postId: string): Promise<void>
  unpin(postId: string): Promise<void>
  bookmark(postId: string): Promise<void>
  removeBookmark(postId: string): Promise<void>
  listBookmarks(query?: PaginationQuery): Promise<Page<PostView>>
  countBookmarks(): Promise<BookmarkCount>
  repost(postId: string): Promise<void>
  unrepost(postId: string): Promise<void>
  listQuotes(request: ListQuotesRequest): Promise<Page<PostView>>
}

interface PostActionParams {
  method: "PUT" | "DELETE"
  postId: string
  action: "pin" | "bookmark" | "repost"
}

export function createPostsResource(request: HttpClient): PostsResource {
  const act = async ({ method, postId, action }: PostActionParams): Promise<void> => {
    await request({
      method,
      path: `/posts/${encodeURIComponent(postId)}/${action}`,
      schema: emptyResponseSchema,
    })
  }

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
    pin: (postId) => act({ method: "PUT", postId, action: "pin" }),
    unpin: (postId) => act({ method: "DELETE", postId, action: "pin" }),
    bookmark: (postId) => act({ method: "PUT", postId, action: "bookmark" }),
    removeBookmark: (postId) => act({ method: "DELETE", postId, action: "bookmark" }),
    listBookmarks: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/bookmarks", query }),
        schema: postPageSchema,
      }),
    countBookmarks: () =>
      request({ method: "GET", path: "/bookmarks/count", schema: bookmarkCountSchema }),
    repost: (postId) => act({ method: "PUT", postId, action: "repost" }),
    unrepost: (postId) => act({ method: "DELETE", postId, action: "repost" }),
    listQuotes: ({ postId, query = {} }) =>
      request({
        method: "GET",
        path: withQuery({ path: `/posts/${encodeURIComponent(postId)}/quotes`, query }),
        schema: postPageSchema,
      }),
  }
}
