import { minutesToMs } from "@contraponha/config"
import {
  comments,
  createDatabaseConnection,
  posts,
  type DatabaseConnection,
} from "@contraponha/database"
import type { CommentView, Page, PostView } from "@contraponha/types"
import { commentPageSchema, commentViewSchema, postViewSchema } from "@contraponha/validation"
import { eq } from "drizzle-orm"
import request from "supertest"
import { inject } from "vitest"

import { bearer, type App } from "./accounts.js"

export interface CreatePostParams {
  server: App
  token: string
  body?: string
}

export interface CreateCommentParams {
  server: App
  token: string
  postId: string
  body?: string
  parentId?: string
}

export interface GetPostParams {
  server: App
  postId: string
}

export interface ListCommentsParams {
  server: App
  id: string
  limit?: number
  cursor?: string | null
}

export interface BackdateParams {
  id: string
  minutes: number
}

export async function createPost({
  server,
  token,
  body = "Um argumento bem construído.",
}: CreatePostParams): Promise<PostView> {
  const response = await request(server)
    .post("/api/v1/posts")
    .set(bearer(token))
    .send({ body })
    .expect(201)

  return postViewSchema.parse(response.body)
}

export async function createComment({
  server,
  token,
  postId,
  body = "Concordo em parte, e explico.",
  parentId,
}: CreateCommentParams): Promise<CommentView> {
  const response = await request(server)
    .post(`/api/v1/posts/${postId}/comments`)
    .set(bearer(token))
    .send({ body, parentId })
    .expect(201)

  return commentViewSchema.parse(response.body)
}

export async function getPost({ server, postId }: GetPostParams): Promise<PostView> {
  const response = await request(server).get(`/api/v1/posts/${postId}`).expect(200)
  return postViewSchema.parse(response.body)
}

export async function listPostComments({
  server,
  id,
  limit,
  cursor,
}: ListCommentsParams): Promise<Page<CommentView>> {
  const response = await request(server)
    .get(`/api/v1/posts/${id}/comments`)
    .query({ limit, cursor: cursor ?? undefined })
    .expect(200)

  return commentPageSchema.parse(response.body)
}

export async function listReplies({
  server,
  id,
  limit,
  cursor,
}: ListCommentsParams): Promise<Page<CommentView>> {
  const response = await request(server)
    .get(`/api/v1/comments/${id}/replies`)
    .query({ limit, cursor: cursor ?? undefined })
    .expect(200)

  return commentPageSchema.parse(response.body)
}

export async function withTestDatabase<TResult>(
  run: (connection: DatabaseConnection) => Promise<TResult>,
): Promise<TResult> {
  const connection = createDatabaseConnection({ url: inject("testDatabaseUrl") })

  try {
    return await run(connection)
  } finally {
    await connection.close()
  }
}

export function backdatePost({ id, minutes }: BackdateParams): Promise<void> {
  return withTestDatabase(async ({ db }) => {
    const createdAt = new Date(Date.now() - minutesToMs(minutes))

    await db.update(posts).set({ createdAt }).where(eq(posts.id, id))
  })
}

export function backdateComment({ id, minutes }: BackdateParams): Promise<void> {
  return withTestDatabase(async ({ db }) => {
    const createdAt = new Date(Date.now() - minutesToMs(minutes))

    await db.update(comments).set({ createdAt }).where(eq(comments.id, id))
  })
}
