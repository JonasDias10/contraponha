import type { NestExpressApplication } from "@nestjs/platform-express"
import { viewerReactionsResponseSchema } from "@contraponha/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createComment, createPost, getPost } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

describe("reactions", () => {
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

  it("counts each reaction once per person, even when repeated", async () => {
    const author = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const post = await createPost({ server, token: author.auth.session.token })
    const path = `/api/v1/posts/${post.id}/reactions/good_argument`

    await request(server).put(path).set(bearer(reader.auth.session.token)).expect(204)

    await request(server).put(path).set(bearer(reader.auth.session.token)).expect(204)

    await request(server).put(path).set(bearer(author.auth.session.token)).expect(204)

    const reacted = await getPost({ server, postId: post.id })

    expect(reacted.reactionCounts.good_argument).toBe(2)
  })

  it("keeps the counter consistent under concurrent requests", async () => {
    const { auth } = await registerAccount({ server })
    const post = await createPost({ server, token: auth.session.token })
    const path = `/api/v1/posts/${post.id}/reactions/insightful`

    await Promise.all(
      Array.from({ length: 10 }, () =>
        request(server).put(path).set(bearer(auth.session.token)).expect(204),
      ),
    )

    const reacted = await getPost({ server, postId: post.id })

    expect(reacted.reactionCounts.insightful).toBe(1)
  })

  it("allows at most two reactions per person on the same target", async () => {
    const author = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const token = reader.auth.session.token
    const post = await createPost({ server, token: author.auth.session.token })
    const base = `/api/v1/posts/${post.id}/reactions`

    await request(server).put(`${base}/good_argument`).set(bearer(token)).expect(204)

    await request(server).put(`${base}/needs_source`).set(bearer(token)).expect(204)

    const third = await request(server).put(`${base}/insightful`).set(bearer(token)).expect(409)

    await request(server).put(`${base}/good_argument`).set(bearer(token)).expect(204)

    await request(server).delete(`${base}/needs_source`).set(bearer(token)).expect(204)

    await request(server).put(`${base}/insightful`).set(bearer(token)).expect(204)

    const reacted = await getPost({ server, postId: post.id })

    expect(third.body.error.code).toBe("REACTION_LIMIT_REACHED")

    expect(reacted.reactionCounts).toEqual({
      good_argument: 1,
      insightful: 1,
      changed_my_mind: 0,
      needs_source: 0,
    })
  })

  it("keeps the limit when several reactions arrive at the same time", async () => {
    const { auth } = await registerAccount({ server })
    const post = await createPost({ server, token: auth.session.token })
    const base = `/api/v1/posts/${post.id}/reactions`
    const kinds = ["good_argument", "insightful", "changed_my_mind", "needs_source"]

    const responses = await Promise.all(
      kinds.map((kind) => request(server).put(`${base}/${kind}`).set(bearer(auth.session.token))),
    )

    const reacted = await getPost({ server, postId: post.id })
    const total = Object.values(reacted.reactionCounts).reduce((sum, count) => sum + count, 0)

    expect(responses.filter(({ status }) => status === 204)).toHaveLength(2)

    expect(total).toBe(2)
  })

  it("removes reactions idempotently", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const post = await createPost({ server, token })
    const path = `/api/v1/posts/${post.id}/reactions/changed_my_mind`

    await request(server).put(path).set(bearer(token)).expect(204)

    await request(server).delete(path).set(bearer(token)).expect(204)

    await request(server).delete(path).set(bearer(token)).expect(204)

    const reacted = await getPost({ server, postId: post.id })

    expect(reacted.reactionCounts.changed_my_mind).toBe(0)
  })

  it("works on comments and rejects unknown kinds and removed content", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const post = await createPost({ server, token })
    const comment = await createComment({ server, token, postId: post.id })

    await request(server)
      .put(`/api/v1/comments/${comment.id}/reactions/insightful`)
      .set(bearer(token))
      .expect(204)

    const comments = await request(server).get(`/api/v1/posts/${post.id}/comments`).expect(200)

    expect(comments.body.items[0].reactionCounts.insightful).toBe(1)

    await request(server)
      .put(`/api/v1/posts/${post.id}/reactions/like`)
      .set(bearer(token))
      .expect(400)

    await request(server).delete(`/api/v1/posts/${post.id}`).set(bearer(token)).expect(204)

    await request(server)
      .put(`/api/v1/posts/${post.id}/reactions/changed_my_mind`)
      .set(bearer(token))
      .expect(404)

    await request(server).put(`/api/v1/posts/${post.id}/reactions/changed_my_mind`).expect(401)
  })

  it("lists the viewer's reactions for a batch of targets", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const reacted = await createPost({ server, token })
    const untouched = await createPost({ server, token })

    await request(server)
      .put(`/api/v1/posts/${reacted.id}/reactions/changed_my_mind`)
      .set(bearer(token))
      .expect(204)

    await request(server)
      .put(`/api/v1/posts/${reacted.id}/reactions/good_argument`)
      .set(bearer(token))
      .expect(204)

    const response = await request(server)
      .get("/api/v1/reactions/mine")
      .query({ targetType: "post", targetIds: `${reacted.id},${untouched.id}` })
      .set(bearer(token))
      .expect(200)

    const { reactions } = viewerReactionsResponseSchema.parse(response.body)
    const byTarget = new Map(reactions.map(({ targetId, kinds }) => [targetId, kinds.toSorted()]))

    expect(byTarget.get(reacted.id)).toEqual(["changed_my_mind", "good_argument"])

    expect(byTarget.get(untouched.id)).toEqual([])

    await request(server)
      .get("/api/v1/reactions/mine")
      .query({ targetType: "post", targetIds: "not-a-uuid" })
      .set(bearer(token))
      .expect(400)
  })
})
