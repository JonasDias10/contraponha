import type { NestExpressApplication } from "@nestjs/platform-express"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { PushDispatchService } from "#src/modules/push/services/push-dispatch.service.js"
import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createComment, createPost } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"
import { openStream } from "./support/sse.js"

describe("realtime events", () => {
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

  it("announces new posts from people you follow", async () => {
    const reader = await registerAccount({ server })
    const writer = await registerAccount({ server })

    await request(server)
      .put(`/api/v1/users/${writer.input.handle}/follow`)
      .set(bearer(reader.auth.session.token))
      .expect(204)

    const stream = await openStream({
      app,
      path: "/api/v1/events",
      token: reader.auth.session.token,
    })

    // The stream loads who the reader follows when it opens.
    await new Promise((resolve) => setTimeout(resolve, 200))

    const post = await createPost({ server, token: writer.auth.session.token })

    const event = await stream.next("feed.new_post")

    expect(event).toEqual({ type: "feed.new_post", postId: post.id })

    stream.close()
  })

  it("announces new contributions on an open post", async () => {
    const author = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const post = await createPost({ server, token: author.auth.session.token })

    const stream = await openStream({
      app,
      path: `/api/v1/posts/${post.id}/events`,
      token: author.auth.session.token,
    })

    const comment = await createComment({
      server,
      token: reader.auth.session.token,
      postId: post.id,
    })

    const event = await stream.next("post.new_comment")

    expect(event).toEqual({
      type: "post.new_comment",
      postId: post.id,
      commentId: comment.id,
      parentId: null,
    })

    stream.close()
  })

  it("tells the recipient when a notification arrives, with the unread count", async () => {
    const author = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const post = await createPost({ server, token: author.auth.session.token })

    const stream = await openStream({
      app,
      path: "/api/v1/events",
      token: author.auth.session.token,
    })

    await createComment({ server, token: reader.auth.session.token, postId: post.id })

    await app.get(PushDispatchService).runOnce()

    const event = await stream.next("notifications.changed")

    expect(event).toEqual({ type: "notifications.changed", unreadCount: 1 })

    stream.close()
  })

  it("requires a session", async () => {
    await request(server).get("/api/v1/events").expect(401)
  })
})
