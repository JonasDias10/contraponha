import type { NestExpressApplication } from "@nestjs/platform-express"
import type { Page, PostView } from "@ponto/types"
import { postPageSchema } from "@ponto/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App, type RegisteredAccount } from "./support/accounts.js"
import { backdatePost, createPost } from "./support/content.js"
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

async function feedPage({ server, path, token, cursor }: FeedPageParams): Promise<Page<PostView>> {
  const pending = request(server)
    .get(path)
    .query({ limit: 50, cursor: cursor ?? undefined })

  const response = await (token ? pending.set(bearer(token)) : pending).expect(200)
  return postPageSchema.parse(response.body)
}

async function allFeaturedIds(server: App): Promise<string[]> {
  const ids: string[] = []
  let cursor: string | null = null

  do {
    const page = await feedPage({ server, path: "/api/v1/feed/featured", cursor })

    ids.push(...page.items.map(({ id }) => id))

    cursor = page.nextCursor
  } while (cursor)

  return ids
}

async function reactMany({ server, postId, kind, people }: ReactManyParams): Promise<void> {
  for (const person of people) {
    await request(server)
      .put(`/api/v1/posts/${postId}/reactions/${kind}`)
      .set(bearer(person.auth.session.token))
      .expect(204)
  }
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

    expect(page.items.map(({ id }) => id)).toEqual([ownPost.id, followedPost.id])

    await request(server).get("/api/v1/feed/following").expect(401)
  })

  it("ranks quality reactions above agreement and leaves out older posts", async () => {
    const author = await registerAccount({ server })
    const token = author.auth.session.token
    const people: RegisteredAccount[] = []

    for (let index = 0; index < 4; index += 1) {
      const person = await registerAccount({ server })

      people.push(person)
    }

    const wellArgued = await createPost({ server, token, body: "Bem argumentado" })
    const merelyAgreed = await createPost({ server, token, body: "Só concordância" })
    const old = await createPost({ server, token, body: "Antigo" })

    await reactMany({
      server,
      postId: wellArgued.id,
      kind: "good_argument",
      people: people.slice(0, 2),
    })

    await reactMany({ server, postId: merelyAgreed.id, kind: "agree", people })

    await reactMany({ server, postId: old.id, kind: "good_argument", people })

    await backdatePost({ id: old.id, minutes: 8 * 24 * 60 })

    const featured = await allFeaturedIds(server)

    expect(featured).toContain(wellArgued.id)

    expect(featured).toContain(merelyAgreed.id)

    expect(featured.indexOf(wellArgued.id)).toBeLessThan(featured.indexOf(merelyAgreed.id))

    expect(featured).not.toContain(old.id)
  })
})
