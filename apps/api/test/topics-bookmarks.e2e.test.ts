import type { NestExpressApplication } from "@nestjs/platform-express"
import {
  bookmarkCountSchema,
  contentRevisionListSchema,
  postPageSchema,
  postViewSchema,
  topicListSchema,
  topicViewSchema,
} from "@contraponha/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createPost, getPost } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

describe("topics, bookmarks and rich posts", () => {
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

  it("offers curated interests and lets people follow them", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token

    const curated = await request(server).get("/api/v1/topics").expect(200)
    const slugs = topicListSchema.parse(curated.body).topics.map(({ slug }) => slug)

    expect(slugs).toContain("mobilidade-urbana")

    await request(server)
      .put("/api/v1/topics/followed")
      .set(bearer(token))
      .send({ slugs: ["cidades", "economia", "ciencia"] })
      .expect(200)

    await request(server).delete("/api/v1/topics/economia/follow").set(bearer(token)).expect(204)

    const followed = await request(server).get("/api/v1/topics/followed").set(bearer(token))
    const topic = await request(server).get("/api/v1/topics/cidades").set(bearer(token))

    expect(topicListSchema.parse(followed.body).topics.map(({ slug }) => slug)).toEqual([
      "cidades",
      "ciencia",
    ])

    expect(topicViewSchema.parse(topic.body).viewer).toEqual({ isFollowing: true })

    await request(server)
      .put("/api/v1/topics/followed")
      .set(bearer(token))
      .send({ slugs: ["nao-existe"] })
      .expect(404)
  })

  it("publishes a post with title, sources, topics and a reply policy", async () => {
    const { auth } = await registerAccount({ server })

    const response = await request(server)
      .post("/api/v1/posts")
      .set(bearer(auth.session.token))
      .send({
        title: "  Tarifa zero em cidade grande  ",
        body: "O que as cidades médias permitem afirmar.",
        sources: [{ url: "https://www.gov.br/relatorio.pdf", title: "Panorama" }],
        topics: ["#TarifaZero", "Mobilidade urbana", "tarifazero"],
        replyPolicy: "following",
      })
      .expect(201)

    const post = postViewSchema.parse(response.body)

    expect(post).toMatchObject({
      title: "Tarifa zero em cidade grande",
      sources: [{ url: "https://www.gov.br/relatorio.pdf", title: "Panorama", host: "gov.br" }],
      replyPolicy: "following",
    })

    expect(post.topics.map(({ slug }) => slug)).toEqual(["tarifazero", "mobilidade-urbana"])

    await request(server)
      .post("/api/v1/posts")
      .set(bearer(auth.session.token))
      .send({ body: "Fonte inválida", sources: [{ url: "javascript:alert(1)" }] })
      .expect(400)
  })

  it("keeps the edit reason in the public history", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const post = await createPost({ server, token, body: "Versão original" })

    await request(server)
      .patch(`/api/v1/posts/${post.id}`)
      .set(bearer(token))
      .send({ title: "Com título", body: "Versão revisada", reason: "Incluí o financiamento" })
      .expect(200)

    const history = await request(server).get(`/api/v1/posts/${post.id}/revisions`).expect(200)
    const edited = await getPost({ server, postId: post.id })

    expect(contentRevisionListSchema.parse(history.body).revisions).toMatchObject([
      { title: null, body: "Versão original", reason: "Incluí o financiamento" },
    ])

    expect(edited).toMatchObject({ title: "Com título", revisionCount: 1 })
  })

  it("pins one post at the top of the profile", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const first = await createPost({ server, token, body: "Primeiro" })
    const second = await createPost({ server, token, body: "Segundo" })
    const third = await createPost({ server, token, body: "Terceiro" })

    await request(server).put(`/api/v1/posts/${first.id}/pin`).set(bearer(token)).expect(204)

    await request(server).put(`/api/v1/posts/${second.id}/pin`).set(bearer(token)).expect(204)

    const response = await request(server)
      .get(`/api/v1/users/${auth.user.handle}/posts`)
      .expect(200)

    const page = postPageSchema.parse(response.body)

    expect(page.items.map(({ id }) => id)).toEqual([second.id, third.id, first.id])

    expect(page.items.filter(({ isPinned }) => isPinned)).toHaveLength(1)
  })

  it("saves posts privately and drops removed ones", async () => {
    const author = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const readerToken = reader.auth.session.token
    const kept = await createPost({ server, token: author.auth.session.token })
    const removed = await createPost({ server, token: author.auth.session.token })

    for (const post of [kept, removed]) {
      await request(server)
        .put(`/api/v1/posts/${post.id}/bookmark`)
        .set(bearer(readerToken))
        .expect(204)
    }

    await request(server)
      .delete(`/api/v1/posts/${removed.id}`)
      .set(bearer(author.auth.session.token))
      .expect(204)

    const saved = await request(server).get("/api/v1/bookmarks").set(bearer(readerToken))
    const count = await request(server).get("/api/v1/bookmarks/count").set(bearer(readerToken))
    const viewed = await request(server).get(`/api/v1/posts/${kept.id}`).set(bearer(readerToken))

    expect(postPageSchema.parse(saved.body).items.map(({ id }) => id)).toEqual([kept.id])

    expect(bookmarkCountSchema.parse(count.body).count).toBe(1)

    expect(postViewSchema.parse(viewed.body).viewer?.isBookmarked).toBe(true)

    await request(server).get("/api/v1/bookmarks").expect(401)
  })
})
