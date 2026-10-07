import type { NestExpressApplication } from "@nestjs/platform-express"
import type { FeedItem, Page } from "@contraponha/types"
import { discussionListSchema, feedPageSchema, postViewSchema } from "@contraponha/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App, type RegisteredAccount } from "./support/accounts.js"
import { backdatePost, createComment, createPost } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

interface FeedPageParams {
  server: App
  path: string
  token?: string
  cursor?: string | null
}

interface ReactManyParams {
  server: App
  postId: string
  kind: string
  people: RegisteredAccount[]
}

interface AllDiscoverParams {
  server: App
  token?: string
}

interface TopicPostParams {
  server: App
  token: string
  body: string
  topics: string[]
}

async function feedPage({ server, path, token, cursor }: FeedPageParams): Promise<Page<FeedItem>> {
  const pending = request(server)
    .get(path)
    .query({ limit: 50, cursor: cursor ?? undefined })

  const response = await (token ? pending.set(bearer(token)) : pending).expect(200)
  return feedPageSchema.parse(response.body)
}

async function allDiscoverItems({ server, token }: AllDiscoverParams): Promise<FeedItem[]> {
  const items: FeedItem[] = []
  let cursor: string | null = null

  do {
    const page = await feedPage({ server, path: "/api/v1/feed/discover", token, cursor })

    items.push(...page.items)

    cursor = page.nextCursor
  } while (cursor)

  return items
}

async function reactMany({ server, postId, kind, people }: ReactManyParams): Promise<void> {
  for (const person of people) {
    await request(server)
      .put(`/api/v1/posts/${postId}/reactions/${kind}`)
      .set(bearer(person.auth.session.token))
      .expect(204)
  }
}

async function createTopicPost({ server, token, body, topics }: TopicPostParams): Promise<string> {
  const response = await request(server)
    .post("/api/v1/posts")
    .set(bearer(token))
    .send({ body, topics })
    .expect(201)

  return postViewSchema.parse(response.body).id
}

describe("feed", () => {
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

  it("shows posts from followed people and the reader, newest first", async () => {
    const reader = await registerAccount({ server })
    const followed = await registerAccount({ server })
    const stranger = await registerAccount({ server })

    await request(server)
      .put(`/api/v1/users/${followed.auth.user.handle}/follow`)
      .set(bearer(reader.auth.session.token))
      .expect(204)

    const followedPost = await createPost({ server, token: followed.auth.session.token })

    await createPost({ server, token: stranger.auth.session.token })

    const ownPost = await createPost({ server, token: reader.auth.session.token })

    const page = await feedPage({
      server,
      path: "/api/v1/feed/following",
      token: reader.auth.session.token,
    })

    expect(page.items.map(({ post }) => post.id)).toEqual([ownPost.id, followedPost.id])

    expect(page.items.every(({ reason }) => reason === null)).toBe(true)

    await request(server).get("/api/v1/feed/following").expect(401)
  })

  it("ranks quality reactions, leaves out older posts and explains each pick", async () => {
    const author = await registerAccount({ server })
    const token = author.auth.session.token
    const people: RegisteredAccount[] = []

    for (let index = 0; index < 4; index += 1) {
      const person = await registerAccount({ server })

      people.push(person)
    }

    const wellArgued = await createPost({ server, token, body: "Bem argumentado" })
    const lessArgued = await createPost({ server, token, body: "Pedindo fonte" })
    const old = await createPost({ server, token, body: "Antigo" })

    await reactMany({ server, postId: wellArgued.id, kind: "good_argument", people })

    await reactMany({ server, postId: lessArgued.id, kind: "needs_source", people })

    await reactMany({ server, postId: old.id, kind: "good_argument", people })

    await backdatePost({ id: old.id, minutes: 8 * 24 * 60 })

    const items = await allDiscoverItems({ server })
    const ids = items.map(({ post }) => post.id)

    expect(ids.indexOf(wellArgued.id)).toBeLessThan(ids.indexOf(lessArgued.id))

    expect(ids).not.toContain(old.id)

    expect(items.find(({ post }) => post.id === wellArgued.id)?.reason).toEqual({
      type: "featured",
      topic: null,
    })
  })

  it("boosts and labels posts in topics the reader follows", async () => {
    const reader = await registerAccount({ server })
    const author = await registerAccount({ server })
    const readerToken = reader.auth.session.token

    await request(server)
      .put("/api/v1/topics/followed")
      .set(bearer(readerToken))
      .send({ slugs: ["dados-abertos"] })
      .expect(200)

    const inTopic = await createTopicPost({
      server,
      token: author.auth.session.token,
      body: "Planilhas abertas da prefeitura",
      topics: ["Dados abertos", "#Orçamento"],
    })

    const items = await allDiscoverItems({ server, token: readerToken })
    const item = items.find(({ post }) => post.id === inTopic)

    expect(item?.reason).toEqual({
      type: "followed_topic",
      topic: { slug: "dados-abertos", name: "Dados abertos", isCurated: true },
    })

    expect(item?.post.topics.map(({ slug }) => slug)).toEqual(["dados-abertos", "orcamento"])

    const topicFeed = await feedPage({ server, path: "/api/v1/feed/topics/orcamento" })

    expect(topicFeed.items.map(({ post }) => post.id)).toContain(inTopic)
  })

  it("lists ongoing discussions with titles", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token

    const response = await request(server)
      .post("/api/v1/posts")
      .set(bearer(token))
      .send({ title: "Discussão animada", body: "Vamos conversar" })
      .expect(201)

    for (let index = 0; index < 30; index += 1)
      await createComment({ server, token, postId: response.body.id })

    const discussions = await request(server).get("/api/v1/feed/discussions").expect(200)
    const list = discussionListSchema.parse(discussions.body)

    expect(list.discussions[0]).toMatchObject({
      postId: response.body.id,
      title: "Discussão animada",
      commentCount: 30,
    })
  })
})
