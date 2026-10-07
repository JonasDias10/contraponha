import type { CommentView, ContentRevisionList, ContributionView, Page } from "@contraponha/types"
import {
  commentPageSchema,
  commentViewSchema,
  contentRevisionListSchema,
  contributionPageSchema,
  type CommentListQuery,
  type CreateCommentInput,
  type HighlightCommentInput,
  type PaginationQuery,
  type UpdateCommentInput,
} from "@contraponha/validation"

import { emptyResponseSchema, withQuery, type HttpClient } from "../http.js"

export interface CreateCommentRequest {
  postId: string
  input: CreateCommentInput
}

export interface ListPostCommentsRequest {
  postId: string
  query?: CommentListQuery
}

export interface HighlightCommentRequest {
  commentId: string
  input?: HighlightCommentInput
}

export interface ListContributionsRequest {
  handle: string
  onlyHighlighted?: boolean
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
  highlight(request: HighlightCommentRequest): Promise<CommentView>
  unhighlight(commentId: string): Promise<void>
  listContributions(request: ListContributionsRequest): Promise<Page<ContributionView>>
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
    highlight: ({ commentId, input = {} }) =>
      request({
        method: "PUT",
        path: `/comments/${encodeURIComponent(commentId)}/highlight`,
        body: input,
        schema: commentViewSchema,
      }),
    unhighlight: async (commentId) => {
      await request({
        method: "DELETE",
        path: `/comments/${encodeURIComponent(commentId)}/highlight`,
        schema: emptyResponseSchema,
      })
    },
    listContributions: ({ handle, onlyHighlighted = false, query = {} }) =>
      request({
        method: "GET",
        path: withQuery({
          path: `/users/${encodeURIComponent(handle)}/${onlyHighlighted ? "highlighted-contributions" : "contributions"}`,
          query,
        }),
        schema: contributionPageSchema,
      }),
  }
}
