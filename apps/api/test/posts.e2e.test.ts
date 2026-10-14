import type { NestExpressApplication } from "@nestjs/platform-express"
import { POST_BODY_MAX_LENGTH } from "@contraponha/config"
import { postRevisions } from "@contraponha/database"
import { contentRevisionListSchema, postPageSchema } from "@contraponha/validation"
import { eq } from "drizzle-orm"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { backdatePost, createPost, getPost, withTestDatabase } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

describe("posts", () => {
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

  describe("publishing", () => {
    it("publishes a post that anyone can read", async () => {
      const { auth } = await registerAccount({ server })

      const post = await createPost({
        server,
        token: auth.session.token,
        body: "  Olá, Contraponha.  ",
      })

      const fetched = await getPost({ server, postId: post.id })

      expect(post).toMatchObject({
        body: "Olá, Contraponha.",
        isDeleted: false,
        commentCount: 0,
        reactionCounts: { good_argument: 0, insightful: 0, changed_my_mind: 0, needs_source: 0 },
        editedAt: null,
      })

      expect(post.author?.handle).toBe(auth.user.handle)

      expect(fetched).toEqual({ ...post, viewer: null })

      expect(post.viewer).toEqual({
        reactions: [],
        isBookmarked: false,
        canReply: true,
        hasReposted: false,
      })
    })

    it("requires a session and a body within the size limit", async () => {
      const { auth } = await registerAccount({ server })

      await request(server).post("/api/v1/posts").send({ body: "sem sessão" }).expect(401)

      const blank = await request(server)
        .post("/api/v1/posts")
        .set(bearer(auth.session.token))
        .send({ body: "   " })
        .expect(400)

      const tooLong = await request(server)
        .post("/api/v1/posts")
        .set(bearer(auth.session.token))
        .send({ body: "a".repeat(POST_BODY_MAX_LENGTH + 1) })
        .expect(400)

      expect(blank.body.error.code).toBe("VALIDATION_FAILED")

      expect(tooLong.body.error.code).toBe("VALIDATION_FAILED")
    })

    it("responds 404 for unknown posts and 400 for malformed ids", async () => {
      await request(server).get("/api/v1/posts/01a10c6c-3803-7cf0-9b8e-03a8eac97154").expect(404)

      await request(server).get("/api/v1/posts/not-a-uuid").expect(400)
    })
  })

  describe("editing", () => {
    it("lets the author edit within the window and keeps the previous version", async () => {
      const { auth } = await registerAccount({ server })
      const post = await createPost({ server, token: auth.session.token, body: "Primeira versão" })

      const response = await request(server)
        .patch(`/api/v1/posts/${post.id}`)
        .set(bearer(auth.session.token))
        .send({ body: "Segunda versão" })
        .expect(200)

      const revisions = await request(server).get(`/api/v1/posts/${post.id}/revisions`).expect(200)

      expect(response.body).toMatchObject({ body: "Segunda versão" })

      expect(response.body.editedAt).not.toBeNull()

      expect(contentRevisionListSchema.parse(revisions.body).revisions).toMatchObject([
        { body: "Primeira versão" },
      ])
    })

    it("refuses edits after 30 minutes", async () => {
      const { auth } = await registerAccount({ server })
      const post = await createPost({ server, token: auth.session.token })

      await backdatePost({ id: post.id, minutes: 31 })

      const response = await request(server)
        .patch(`/api/v1/posts/${post.id}`)
        .set(bearer(auth.session.token))
        .send({ body: "Tarde demais" })
        .expect(409)

      expect(response.body.error.code).toBe("EDIT_WINDOW_EXPIRED")
    })

    it("only lets the author edit", async () => {
      const author = await registerAccount({ server })
      const stranger = await registerAccount({ server })
      const post = await createPost({ server, token: author.auth.session.token })

      const response = await request(server)
        .patch(`/api/v1/posts/${post.id}`)
        .set(bearer(stranger.auth.session.token))
        .send({ body: "Não é meu" })
        .expect(403)

      expect(response.body.error.code).toBe("FORBIDDEN")
    })
  })

  describe("removal", () => {
    it("leaves a marker and erases the content and its history", async () => {
      const author = await registerAccount({ server })
      const stranger = await registerAccount({ server })
      const token = author.auth.session.token
      const post = await createPost({ server, token, body: "Vou apagar" })

      await request(server)
        .patch(`/api/v1/posts/${post.id}`)
        .set(bearer(token))
        .send({ body: "Vou apagar mesmo" })
        .expect(200)

      await request(server)
        .delete(`/api/v1/posts/${post.id}`)
        .set(bearer(stranger.auth.session.token))
        .expect(403)

      await request(server).delete(`/api/v1/posts/${post.id}`).set(bearer(token)).expect(204)

      const removed = await getPost({ server, postId: post.id })

      const storedRevisions = await withTestDatabase(({ db }) =>
        db.select().from(postRevisions).where(eq(postRevisions.postId, post.id)),
      )

      expect(removed).toMatchObject({ isDeleted: true, body: null, author: null })

      expect(storedRevisions).toHaveLength(0)

      await request(server).get(`/api/v1/posts/${post.id}/revisions`).expect(404)

      await request(server)
        .patch(`/api/v1/posts/${post.id}`)
        .set(bearer(token))
        .send({ body: "Ressuscitar" })
        .expect(404)

      await request(server).delete(`/api/v1/posts/${post.id}`).set(bearer(token)).expect(404)
    })
  })

  describe("listing by author", () => {
    it("pages through active posts, newest first", async () => {
      const { auth } = await registerAccount({ server })
      const token = auth.session.token
      const first = await createPost({ server, token, body: "Primeiro" })
      const second = await createPost({ server, token, body: "Segundo" })
      const third = await createPost({ server, token, body: "Terceiro" })
      const removed = await createPost({ server, token, body: "Removido" })

      await request(server).delete(`/api/v1/posts/${removed.id}`).set(bearer(token)).expect(204)

      const pageOne = await request(server)
        .get(`/api/v1/users/${auth.user.handle}/posts`)
        .query({ limit: 2 })
        .expect(200)

      const parsedOne = postPageSchema.parse(pageOne.body)

      const pageTwo = await request(server)
        .get(`/api/v1/users/${auth.user.handle}/posts`)
        .query({ limit: 2, cursor: parsedOne.nextCursor })
        .expect(200)

      const parsedTwo = postPageSchema.parse(pageTwo.body)

      expect(parsedOne.items.map((post) => post.id)).toEqual([third.id, second.id])

      expect(parsedTwo.items.map((post) => post.id)).toEqual([first.id])

      expect(parsedTwo.nextCursor).toBeNull()
    })

    it("rejects tampered cursors and unknown authors", async () => {
      const { auth } = await registerAccount({ server })

      const tampered = await request(server)
        .get(`/api/v1/users/${auth.user.handle}/posts`)
        .query({ cursor: "bm90LWpzb24" })
        .expect(400)

      expect(tampered.body.error.code).toBe("VALIDATION_FAILED")

      await request(server).get("/api/v1/users/nobody_here_at_all/posts").expect(404)
    })
  })
})
