import type { NestExpressApplication } from "@nestjs/platform-express"
import {
  feedPageSchema,
  notificationPageSchema,
  profilePageSchema,
  profileViewSchema,
} from "@contraponha/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createComment, createPost } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

describe("blocks and mutes", () => {
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

  it("blocking ends follows both ways and stops every interaction", async () => {
    const alice = await registerAccount({ server })
    const bob = await registerAccount({ server })
    const aliceToken = alice.auth.session.token
    const bobToken = bob.auth.session.token

    await request(server)
      .put(`/api/v1/users/${bob.input.handle}/follow`)
      .set(bearer(aliceToken))
      .expect(204)

    await request(server)
      .put(`/api/v1/users/${alice.input.handle}/follow`)
      .set(bearer(bobToken))
      .expect(204)

    const post = await createPost({ server, token: aliceToken })

    await request(server)
      .put(`/api/v1/users/${bob.input.handle}/block`)
      .set(bearer(aliceToken))
      .expect(204)

    const profile = await request(server)
      .get(`/api/v1/users/${bob.input.handle}`)
      .set(bearer(aliceToken))
      .expect(200)

    expect(profileViewSchema.parse(profile.body)).toMatchObject({
      followerCount: 0,
      followingCount: 0,
      viewer: { isFollowing: false, isFollowedBy: false, isBlocking: true, isBlockedBy: false },
    })

    const follow = await request(server)
      .put(`/api/v1/users/${alice.input.handle}/follow`)
      .set(bearer(bobToken))
      .expect(403)

    expect(follow.body.error.code).toBe("INTERACTION_BLOCKED")

    await request(server)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set(bearer(bobToken))
      .send({ body: "Discordo." })
      .expect(403)

    await request(server)
      .put(`/api/v1/posts/${post.id}/reactions/insightful`)
      .set(bearer(bobToken))
      .expect(403)

    const posts = await request(server)
      .get(`/api/v1/users/${alice.input.handle}/posts`)
      .set(bearer(bobToken))
      .expect(200)

    expect(posts.body.items).toHaveLength(0)

    const blocks = await request(server)
      .get("/api/v1/me/blocks")
      .set(bearer(aliceToken))
      .expect(200)

    expect(profilePageSchema.parse(blocks.body).items.map(({ handle }) => handle)).toEqual([
      bob.input.handle,
    ])

    await request(server)
      .delete(`/api/v1/users/${bob.input.handle}/block`)
      .set(bearer(aliceToken))
      .expect(204)

    await request(server)
      .put(`/api/v1/users/${alice.input.handle}/follow`)
      .set(bearer(bobToken))
      .expect(204)
  })

  it("muting hides the person's posts, contributions and notifications from the muter only", async () => {
    const reader = await registerAccount({ server })
    const noisy = await registerAccount({ server })
    const readerToken = reader.auth.session.token
    const noisyToken = noisy.auth.session.token

    await request(server)
      .put(`/api/v1/users/${noisy.input.handle}/follow`)
      .set(bearer(readerToken))
      .expect(204)

    await request(server)
      .put(`/api/v1/users/${noisy.input.handle}/mute`)
      .set(bearer(readerToken))
      .expect(204)

    const noisyPost = await createPost({ server, token: noisyToken })
    const readerPost = await createPost({ server, token: readerToken })

    await createComment({ server, token: noisyToken, postId: readerPost.id })

    const feed = await request(server)
      .get("/api/v1/feed/following")
      .set(bearer(readerToken))
      .expect(200)

    const feedIds = feedPageSchema.parse(feed.body).items.map(({ post }) => post.id)

    expect(feedIds).not.toContain(noisyPost.id)

    const comments = await request(server)
      .get(`/api/v1/posts/${readerPost.id}/comments`)
      .set(bearer(readerToken))
      .expect(200)

    expect(comments.body.items).toHaveLength(0)

    const notifications = await request(server)
      .get("/api/v1/notifications")
      .set(bearer(readerToken))
      .expect(200)

    expect(notificationPageSchema.parse(notifications.body).items).toHaveLength(0)

    const muted = await request(server)
      .get(`/api/v1/users/${noisy.input.handle}`)
      .set(bearer(readerToken))
      .expect(200)

    expect(muted.body.viewer).toMatchObject({ isMuting: true, isFollowing: true })

    const othersView = await request(server)
      .get(`/api/v1/posts/${readerPost.id}/comments`)
      .set(bearer(noisyToken))
      .expect(200)

    expect(othersView.body.items).toHaveLength(1)
  })

  it("refuses blocking yourself", async () => {
    const { input, auth } = await registerAccount({ server })

    await request(server)
      .put(`/api/v1/users/${input.handle}/block`)
      .set(bearer(auth.session.token))
      .expect(400)
  })
})
