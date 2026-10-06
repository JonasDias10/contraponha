import type { CommentView, ContentRevisionList, Page } from "@ponto/types"
import {
  commentPageSchema,
  commentViewSchema,
  contentRevisionListSchema,
  type CreateCommentInput,
  type PaginationQuery,
  type UpdateCommentInput,
} from "@ponto/validation"

import { emptyResponseSchema, withQuery, type HttpClient } from "../http.js"

export interface CreateCommentRequest {
  postId: string
  input: CreateCommentInput
}

export interface ListPostCommentsRequest {
  postId: string
  query?: PaginationQuery
}

export interface ListRepliesRequest {
  commentId: string
  query?: PaginationQuery
}

export interface UpdateCommentRequest {
  commentId: string
  input: UpdateCommentInput
}

export interface CommentsResource {
  create(request: CreateCommentRequest): Promise<CommentView>
  listForPost(request: ListPostCommentsRequest): Promise<Page<CommentView>>
  listReplies(request: ListRepliesRequest): Promise<Page<CommentView>>
  update(request: UpdateCommentRequest): Promise<CommentView>
  delete(commentId: string): Promise<void>
  listRevisions(commentId: string): Promise<ContentRevisionList>
}

export function createCommentsResource(request: HttpClient): CommentsResource {
  return {
    create: ({ postId, input }) =>
      request({
        method: "POST",
        path: `/posts/${encodeURIComponent(postId)}/comments`,
        body: input,
        schema: commentViewSchema,
      }),
    listForPost: ({ postId, query = {} }) =>
      request({
        method: "GET",
        path: withQuery({ path: `/posts/${encodeURIComponent(postId)}/comments`, query }),
        schema: commentPageSchema,
      }),
    listReplies: ({ commentId, query = {} }) =>
      request({
        method: "GET",
        path: withQuery({ path: `/comments/${encodeURIComponent(commentId)}/replies`, query }),
        schema: commentPageSchema,
      }),
    update: ({ commentId, input }) =>
      request({
        method: "PATCH",
        path: `/comments/${encodeURIComponent(commentId)}`,
        body: input,
        schema: commentViewSchema,
      }),
    delete: async (commentId) => {
      await request({
        method: "DELETE",
        path: `/comments/${encodeURIComponent(commentId)}`,
        schema: emptyResponseSchema,
      })
    },
    listRevisions: (commentId) =>
      request({
        method: "GET",
        path: `/comments/${encodeURIComponent(commentId)}/revisions`,
        schema: contentRevisionListSchema,
      }),
  }
}
