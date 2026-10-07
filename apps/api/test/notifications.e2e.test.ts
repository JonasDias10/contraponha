import type { NestExpressApplication } from "@nestjs/platform-express"
import type { NotificationView, Page } from "@ponto/types"
import { notificationPageSchema, unreadNotificationCountSchema } from "@ponto/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App, type RegisteredAccount } from "./support/accounts.js"
import { createComment, createPost } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

interface NotificationsParams {
  server: App
  token: string
}

async function listNotifications({
  server,
  token,
}: NotificationsParams): Promise<Page<NotificationView>> {
  const response = await request(server).get("/api/v1/notifications").set(bearer(token)).expect(200)
  return notificationPageSchema.parse(response.body)
}

async function enableAllNotifications({ server, token }: NotificationsParams): Promise<void> {
  await request(server)
    .patch("/api/v1/notifications/preferences")
    .set(bearer(token))
    .send({ reactions: true, follows: true })
    .expect(200)
}

async function unreadCount({ server, token }: NotificationsParams): Promise<number> {
  const response = await request(server)
    .get("/api/v1/notifications/unread-count")
    .set(bearer(token))
    .expect(200)

  return unreadNotificationCountSchema.parse(response.body).count
}

describe("notifications", () => {
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

  it("notifies authors about comments, replies, reactions and new followers", async () => {
    const author = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const authorToken = author.auth.session.token
    const readerToken = reader.auth.session.token
    const post = await createPost({ server, token: authorToken })
    const authorComment = await createComment({ server, token: authorToken, postId: post.id })

    await enableAllNotifications({ server, token: authorToken })

    await createComment({ server, token: readerToken, postId: post.id })

    await createComment({ server, token: readerToken, postId: post.id, parentId: authorComment.id })

    await request(server)
      .put(`/api/v1/posts/${post.id}/reactions/good_argument`)
      .set(bearer(readerToken))
      .expect(204)

    await request(server)
      .put(`/api/v1/comments/${authorComment.id}/reactions/insightful`)
      .set(bearer(readerToken))
      .expect(204)

    await request(server)
      .put(`/api/v1/users/${author.auth.user.handle}/follow`)
      .set(bearer(readerToken))
      .expect(204)

    const page = await listNotifications({ server, token: authorToken })

    expect(page.items.map(({ type }) => type)).toEqual([
      "user_followed",
      "comment_reacted",
      "post_reacted",
      "comment_replied",
      "post_commented",
    ])

    expect(page.items.every(({ actors }) => actors[0]?.handle === reader.auth.user.handle)).toBe(
      true,
    )

    expect(page.items[1]).toMatchObject({ commentId: authorComment.id, post: null })

    const readerPage = await listNotifications({ server, token: readerToken })

    expect(readerPage.items).toEqual([])
  })

  it("does not notify people about their own actions or repeated reactions", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const post = await createPost({ server, token })

    await createComment({ server, token, postId: post.id })

    await request(server)
      .put(`/api/v1/posts/${post.id}/reactions/changed_my_mind`)
      .set(bearer(token))
      .expect(204)

    const page = await listNotifications({ server, token })

    expect(page.items).toEqual([])
  })

  it("tracks unread notifications and marks them as read", async () => {
    const author = await registerAccount({ server })
    const authorToken = author.auth.session.token
    const post = await createPost({ server, token: authorToken })

    for (let index = 0; index < 3; index += 1) {
      const reader = await registerAccount({ server })

      await createComment({ server, token: reader.auth.session.token, postId: post.id })
    }

    const before = await unreadCount({ server, token: authorToken })
    const page = await listNotifications({ server, token: authorToken })
    const [newest] = page.items

    expect(before).toBe(3)

    await request(server)
      .post(`/api/v1/notifications/${newest?.id}/read`)
      .set(bearer(authorToken))
      .expect(204)

    await request(server)
      .post(`/api/v1/notifications/${newest?.id}/read`)
      .set(bearer(authorToken))
      .expect(204)

    const afterOne = await unreadCount({ server, token: authorToken })

    await request(server)
      .post("/api/v1/notifications/read-all")
      .set(bearer(authorToken))
      .expect(204)

    const afterReadAll = await unreadCount({ server, token: authorToken })
    const reread = await listNotifications({ server, token: authorToken })

    expect(afterOne).toBe(2)

    expect(afterReadAll).toBe(0)

    expect(reread.items.every(({ isRead }) => isRead)).toBe(true)
  })

  it("keeps notifications private to their recipient", async () => {
    const author = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const post = await createPost({ server, token: author.auth.session.token })

    await createComment({ server, token: reader.auth.session.token, postId: post.id })

    const page = await listNotifications({ server, token: author.auth.session.token })

    await request(server)
      .post(`/api/v1/notifications/${page.items[0]?.id}/read`)
      .set(bearer(reader.auth.session.token))
      .expect(404)

    await request(server).get("/api/v1/notifications").expect(401)
  })

  it("groups repeated events and respects the switches", async () => {
    const author = await registerAccount({ server })
    const authorToken = author.auth.session.token
    const post = await createPost({ server, token: authorToken })

    await enableAllNotifications({ server, token: authorToken })

    const readers: RegisteredAccount[] = []

    for (let index = 0; index < 3; index += 1) {
      const reader = await registerAccount({ server })

      readers.push(reader)
    }

    for (const reader of readers) {
      await request(server)
        .put(`/api/v1/posts/${post.id}/reactions/good_argument`)
        .set(bearer(reader.auth.session.token))
        .expect(204)
    }

    const page = await listNotifications({ server, token: authorToken })
    const [grouped] = page.items

    expect(page.items).toHaveLength(1)

    expect(grouped).toMatchObject({ type: "post_reacted", actorCount: 3 })

    expect(grouped?.actors.map(({ handle }) => handle)).toEqual([
      readers[2]?.auth.user.handle,
      readers[1]?.auth.user.handle,
    ])
  })

  it("holds notifications until the chosen digest hour", async () => {
    const author = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const authorToken = author.auth.session.token
    const post = await createPost({ server, token: authorToken })
    const now = new Date()
    const hourInSaoPaulo = (now.getUTCHours() - 3 + 24) % 24
    const laterHour = (hourInSaoPaulo + 2) % 24

    await request(server)
      .patch("/api/v1/notifications/preferences")
      .set(bearer(authorToken))
      .send({ digestHours: [laterHour] })
      .expect(200)

    await createComment({ server, token: reader.auth.session.token, postId: post.id })

    const page = await listNotifications({ server, token: authorToken })
    const unread = await unreadCount({ server, token: authorToken })

    expect(page.items).toEqual([])

    expect(unread).toBe(0)
  })

  it("tells people when they are mentioned and when a contribution is highlighted", async () => {
    const author = await registerAccount({ server })
    const contributor = await registerAccount({ server })
    const mentioned = await registerAccount({ server })
    const authorToken = author.auth.session.token

    const post = await createPost({
      server,
      token: authorToken,
      body: `O que você acha, @${mentioned.auth.user.handle}?`,
    })

    const comment = await createComment({
      server,
      token: contributor.auth.session.token,
      postId: post.id,
    })

    await request(server)
      .put(`/api/v1/comments/${comment.id}/highlight`)
      .set(bearer(authorToken))
      .send({ note: "Trouxe dado de campo" })
      .expect(200)

    const mentionedPage = await listNotifications({ server, token: mentioned.auth.session.token })

    const contributorPage = await listNotifications({
      server,
      token: contributor.auth.session.token,
    })

    expect(mentionedPage.items.map(({ type }) => type)).toEqual(["mentioned"])

    expect(contributorPage.items.map(({ type }) => type)).toEqual(["comment_highlighted"])

    expect(contributorPage.items[0]?.post?.id).toBe(post.id)
  })
})
