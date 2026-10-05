import type { NestExpressApplication } from "@nestjs/platform-express"
import { comments, posts, reconcileCounters, users } from "@ponto/database"
import { eq } from "drizzle-orm"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createComment, createPost, getPost, withTestDatabase } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

describe("counter reconciliation", () => {
  let app: NestExpressApplication
  let server: App

  beforeAll(async () => {
    const testApp = await createTestApp()

    app = testApp.app

    server = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
  })

  it("restores drifted counters from the source rows and leaves correct ones alone", async () => {
    const author = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const token = author.auth.session.token
    const post = await createPost({ server, token })
    const comment = await createComment({ server, token, postId: post.id })

    await createComment({ server, token, postId: post.id, parentId: comment.id })

    await request(server)
      .put(`/api/v1/posts/${post.id}/reactions/agree`)
      .set(bearer(reader.auth.session.token))
      .expect(204)

    await request(server)
      .put(`/api/v1/users/${author.auth.user.handle}/follow`)
      .set(bearer(reader.auth.session.token))
      .expect(204)

    const firstRun = await withTestDatabase(({ db }) => reconcileCounters({ db, batchSize: 2 }))

    expect(firstRun).toEqual({ users: 0, posts: 0, comments: 0 })

    await withTestDatabase(async ({ db }) => {
      await db.update(users).set({ followerCount: 999 }).where(eq(users.id, author.auth.user.id))

      await db.update(posts).set({ commentCount: 0, agreeCount: 7 }).where(eq(posts.id, post.id))

      await db.update(comments).set({ replyCount: 5 }).where(eq(comments.id, comment.id))
    })

    const repairRun = await withTestDatabase(({ db }) => reconcileCounters({ db, batchSize: 2 }))
    const repairedPost = await getPost({ server, postId: post.id })

    const profile = await request(server)
      .get(`/api/v1/users/${author.auth.user.handle}`)
      .expect(200)

    expect(repairRun).toEqual({ users: 1, posts: 1, comments: 1 })

    expect(repairedPost).toMatchObject({
      commentCount: 2,
      reactionCounts: { good_argument: 0, insightful: 0, agree: 1, disagree: 0 },
    })

    expect(profile.body).toMatchObject({ followerCount: 1, followingCount: 0 })
  })
})
