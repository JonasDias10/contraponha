import type { NestExpressApplication } from "@nestjs/platform-express"
import {
  feedPageSchema,
  notificationPageSchema,
  postPageSchema,
  postViewSchema,
} from "@contraponha/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createPost } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

describe("reposts and quotes", () => {
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

  it("puts a repost in the reposter's followers' feed and counts it once", async () => {
    const author = await registerAccount({ server })
    const sharer = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const post = await createPost({ server, token: author.auth.session.token })

    await request(server)
      .patch("/api/v1/notifications/preferences")
      .set(bearer(author.auth.session.token))
      .send({ reactions: true })
      .expect(200)

    await request(server)
      .put(`/api/v1/users/${sharer.input.handle}/follow`)
      .set(bearer(reader.auth.session.token))
      .expect(204)

    await request(server)
      .put(`/api/v1/posts/${post.id}/repost`)
      .set(bearer(sharer.auth.session.token))
      .expect(204)

    await request(server)
      .put(`/api/v1/posts/${post.id}/repost`)
      .set(bearer(sharer.auth.session.token))
      .expect(204)

    const feed = await request(server)
      .get("/api/v1/feed/following")
      .set(bearer(reader.auth.session.token))
      .expect(200)

    const [item] = feedPageSchema.parse(feed.body).items

    expect(item?.post).toMatchObject({ id: post.id, repostCount: 1 })

    expect(item?.repostedBy?.handle).toBe(sharer.input.handle)

    const viewed = await request(server)
      .get(`/api/v1/posts/${post.id}`)
      .set(bearer(sharer.auth.session.token))
      .expect(200)

    expect(postViewSchema.parse(viewed.body).viewer?.hasReposted).toBe(true)

    const notifications = await request(server)
      .get("/api/v1/notifications")
      .set(bearer(author.auth.session.token))
      .expect(200)

    expect(notificationPageSchema.parse(notifications.body).items[0]?.type).toBe("post_reposted")

    await request(server)
      .delete(`/api/v1/posts/${post.id}/repost`)
      .set(bearer(sharer.auth.session.token))
      .expect(204)

    const after = await request(server).get(`/api/v1/posts/${post.id}`).expect(200)

    expect(after.body.repostCount).toBe(0)

    const emptyFeed = await request(server)
      .get("/api/v1/feed/following")
      .set(bearer(reader.auth.session.token))
      .expect(200)

    expect(emptyFeed.body.items).toHaveLength(0)
  })

  it("embeds the quoted post, counts quotes and keeps the quote if the original goes", async () => {
    const author = await registerAccount({ server })
    const quoter = await registerAccount({ server })
    const original = await createPost({ server, token: author.auth.session.token })

    const created = await request(server)
      .post("/api/v1/posts")
      .set(bearer(quoter.auth.session.token))
      .send({ body: "Discordo, e explico por quê.", quotedPostId: original.id })
      .expect(201)

    const quote = postViewSchema.parse(created.body)

    expect(quote.quotedPost).toMatchObject({ id: original.id, isDeleted: false })

    const quotes = await request(server).get(`/api/v1/posts/${original.id}/quotes`).expect(200)

    expect(postPageSchema.parse(quotes.body).items.map(({ id }) => id)).toEqual([quote.id])

    const counted = await request(server).get(`/api/v1/posts/${original.id}`).expect(200)

    expect(counted.body.quoteCount).toBe(1)

    const notifications = await request(server)
      .get("/api/v1/notifications")
      .set(bearer(author.auth.session.token))
      .expect(200)

    expect(notificationPageSchema.parse(notifications.body).items[0]).toMatchObject({
      type: "post_quoted",
      post: { id: quote.id },
    })

    await request(server)
      .delete(`/api/v1/posts/${original.id}`)
      .set(bearer(author.auth.session.token))
      .expect(204)

    const orphan = await request(server).get(`/api/v1/posts/${quote.id}`).expect(200)

    expect(orphan.body.quotedPost).toMatchObject({
      id: original.id,
      isDeleted: true,
      excerpt: null,
    })
  })

  it("refuses reposting or quoting across a block", async () => {
    const author = await registerAccount({ server })
    const blocked = await registerAccount({ server })
    const post = await createPost({ server, token: author.auth.session.token })

    await request(server)
      .put(`/api/v1/users/${blocked.input.handle}/block`)
      .set(bearer(author.auth.session.token))
      .expect(204)

    await request(server)
      .put(`/api/v1/posts/${post.id}/repost`)
      .set(bearer(blocked.auth.session.token))
      .expect(403)

    await request(server)
      .post("/api/v1/posts")
      .set(bearer(blocked.auth.session.token))
      .send({ body: "Citação", quotedPostId: post.id })
      .expect(403)
  })

  it("requires a session to repost", async () => {
    const author = await registerAccount({ server })
    const post = await createPost({ server, token: author.auth.session.token })

    await request(server).put(`/api/v1/posts/${post.id}/repost`).expect(401)
  })
})
