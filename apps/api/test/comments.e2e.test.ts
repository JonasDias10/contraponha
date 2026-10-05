import type { NestExpressApplication } from "@nestjs/platform-express"
import { contentRevisionListSchema } from "@ponto/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import {
  backdateComment,
  createComment,
  createPost,
  getPost,
  listPostComments,
  listReplies,
} from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

describe("comments", () => {
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

  describe("threads", () => {
    it("keeps replies one level deep by attaching replies-to-replies to the root", async () => {
      const { auth } = await registerAccount({ server })
      const token = auth.session.token
      const post = await createPost({ server, token })
      const root = await createComment({ server, token, postId: post.id, body: "Raiz" })

      const reply = await createComment({
        server,
        token,
        postId: post.id,
        parentId: root.id,
        body: "Resposta",
      })

      const replyToReply = await createComment({
        server,
        token,
        postId: post.id,
        parentId: reply.id,
        body: "Resposta à resposta",
      })

      const topLevel = await listPostComments({ server, id: post.id })

      const replies = await listReplies({ server, id: root.id })

      expect(reply.parentId).toBe(root.id)

      expect(replyToReply.parentId).toBe(root.id)

      expect(topLevel.items).toMatchObject([{ id: root.id, replyCount: 2 }])

      expect(replies.items.map((item) => item.id)).toEqual([reply.id, replyToReply.id])

      const updatedPost = await getPost({ server, postId: post.id })

      expect(updatedPost.commentCount).toBe(3)
    })

    it("pages through top-level comments, oldest first", async () => {
      const { auth } = await registerAccount({ server })
      const token = auth.session.token
      const post = await createPost({ server, token })
      const first = await createComment({ server, token, postId: post.id, body: "1" })
      const second = await createComment({ server, token, postId: post.id, body: "2" })
      const third = await createComment({ server, token, postId: post.id, body: "3" })

      const pageOne = await listPostComments({ server, id: post.id, limit: 2 })

      const pageTwo = await listPostComments({
        server,
        id: post.id,
        limit: 2,
        cursor: pageOne.nextCursor,
      })

      expect(pageOne.items.map((item) => item.id)).toEqual([first.id, second.id])

      expect(pageTwo.items.map((item) => item.id)).toEqual([third.id])

      expect(pageTwo.nextCursor).toBeNull()
    })

    it("refuses replies to comments from another post and comments on removed posts", async () => {
      const { auth } = await registerAccount({ server })
      const token = auth.session.token
      const post = await createPost({ server, token })
      const otherPost = await createPost({ server, token })
      const otherComment = await createComment({ server, token, postId: otherPost.id })

      await request(server)
        .post(`/api/v1/posts/${post.id}/comments`)
        .set(bearer(token))
        .send({ body: "Fora de lugar", parentId: otherComment.id })
        .expect(404)

      await request(server).delete(`/api/v1/posts/${post.id}`).set(bearer(token)).expect(204)

      await request(server)
        .post(`/api/v1/posts/${post.id}/comments`)
        .set(bearer(token))
        .send({ body: "Tarde" })
        .expect(404)
    })
  })

  describe("editing", () => {
    it("follows the same 30-minute window and authorship rules as posts", async () => {
      const author = await registerAccount({ server })
      const stranger = await registerAccount({ server })
      const token = author.auth.session.token
      const post = await createPost({ server, token })
      const comment = await createComment({ server, token, postId: post.id, body: "Versão 1" })

      await request(server)
        .patch(`/api/v1/comments/${comment.id}`)
        .set(bearer(stranger.auth.session.token))
        .send({ body: "Intruso" })
        .expect(403)

      await request(server)
        .patch(`/api/v1/comments/${comment.id}`)
        .set(bearer(token))
        .send({ body: "Versão 2" })
        .expect(200)

      const revisions = await request(server)
        .get(`/api/v1/comments/${comment.id}/revisions`)
        .expect(200)

      expect(contentRevisionListSchema.parse(revisions.body).revisions).toMatchObject([
        { body: "Versão 1" },
      ])

      await backdateComment({ id: comment.id, minutes: 31 })

      const late = await request(server)
        .patch(`/api/v1/comments/${comment.id}`)
        .set(bearer(token))
        .send({ body: "Versão 3" })
        .expect(409)

      expect(late.body.error.code).toBe("EDIT_WINDOW_EXPIRED")
    })
  })

  describe("removal", () => {
    it("keeps a removed comment as a marker only while it anchors replies", async () => {
      const { auth } = await registerAccount({ server })
      const token = auth.session.token
      const post = await createPost({ server, token })
      const withReplies = await createComment({ server, token, postId: post.id })

      const reply = await createComment({
        server,
        token,
        postId: post.id,
        parentId: withReplies.id,
      })

      const alone = await createComment({ server, token, postId: post.id })

      await request(server)
        .delete(`/api/v1/comments/${withReplies.id}`)
        .set(bearer(token))
        .expect(204)

      await request(server).delete(`/api/v1/comments/${alone.id}`).set(bearer(token)).expect(204)

      const listed = await listPostComments({ server, id: post.id })

      expect(listed.items).toMatchObject([
        { id: withReplies.id, isDeleted: true, body: null, author: null, replyCount: 1 },
      ])

      const postAfterFirstRemovals = await getPost({ server, postId: post.id })

      expect(postAfterFirstRemovals.commentCount).toBe(1)

      await request(server).delete(`/api/v1/comments/${reply.id}`).set(bearer(token)).expect(204)

      const afterReplyRemoved = await listPostComments({ server, id: post.id })

      expect(afterReplyRemoved.items).toHaveLength(0)

      const postAfterAllRemovals = await getPost({ server, postId: post.id })

      expect(postAfterAllRemovals.commentCount).toBe(0)
    })
  })
})
