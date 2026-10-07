import { randomBytes } from "node:crypto"

import type { NestExpressApplication } from "@nestjs/platform-express"
import { HIGHLIGHT_END, HIGHLIGHT_START } from "@ponto/types"
import {
  contributionSearchPageSchema,
  postSearchPageSchema,
  profilePageSchema,
  topicListSchema,
} from "@ponto/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createComment, createPost } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

interface SearchParams {
  server: App
  q: string
}

async function searchPostIds({ server, q }: SearchParams): Promise<string[]> {
  const response = await request(server).get("/api/v1/search/posts").query({ q }).expect(200)
  return postSearchPageSchema.parse(response.body).items.map(({ post }) => post.id)
}

async function searchHandles({ server, q }: SearchParams): Promise<string[]> {
  const response = await request(server).get("/api/v1/search/users").query({ q }).expect(200)
  return profilePageSchema.parse(response.body).items.map(({ handle }) => handle)
}

describe("search", () => {
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

  it("finds posts by meaning in Portuguese, not just exact words", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const marker = `marcador${randomBytes(3).toString("hex")}`

    const match = await createPost({
      server,
      token,
      body: `Os argumentos foram convincentes sobre ${marker}.`,
    })

    const other = await createPost({
      server,
      token,
      body: `Nada a ver com ${marker}, só culinária.`,
    })

    const byStem = await searchPostIds({ server, q: `argumento convincente ${marker}` })
    const excluding = await searchPostIds({ server, q: `${marker} -culinária` })

    expect(byStem).toEqual([match.id])

    expect(excluding).toEqual([match.id])

    expect(excluding).not.toContain(other.id)
  })

  it("leaves removed posts out of the results", async () => {
    const { auth } = await registerAccount({ server })
    const marker = `removivel${randomBytes(3).toString("hex")}`
    const post = await createPost({ server, token: auth.session.token, body: `Texto ${marker}` })

    await request(server)
      .delete(`/api/v1/posts/${post.id}`)
      .set(bearer(auth.session.token))
      .expect(204)

    const results = await searchPostIds({ server, q: marker })

    expect(results).toEqual([])
  })

  it("finds people by partial handle, name and small typos", async () => {
    const suffix = randomBytes(3).toString("hex")

    const { auth } = await registerAccount({
      server,
      overrides: { handle: `quixote_${suffix}`, displayName: `Dulcineia Quixotesca ${suffix}` },
    })

    const byHandlePrefix = await searchHandles({ server, q: `quixote_${suffix}` })
    const byName = await searchHandles({ server, q: `Quixotesca ${suffix}` })
    const withTypo = await searchHandles({ server, q: `Dulcinea Quixotezca ${suffix}` })

    expect(byHandlePrefix).toContain(auth.user.handle)

    expect(byName).toContain(auth.user.handle)

    expect(withTypo).toContain(auth.user.handle)
  })

  it("treats LIKE wildcards literally and validates the query", async () => {
    const wildcard = await searchHandles({ server, q: "%%" })

    expect(wildcard).toEqual([])

    await request(server).get("/api/v1/search/users").query({ q: "a" }).expect(400)

    await request(server).get("/api/v1/search/posts").expect(400)
  })

  it("highlights matches and filters posts that cite a source", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const marker = `fonteteste${randomBytes(3).toString("hex")}`

    const cited = await request(server)
      .post("/api/v1/posts")
      .set(bearer(token))
      .send({
        title: `Dados sobre ${marker}`,
        body: "O relatório mostra a série completa.",
        sources: [{ url: "https://www.ibge.gov.br/relatorio", title: "Relatório" }],
      })
      .expect(201)

    await createPost({ server, token, body: `Opinião sem fonte sobre ${marker}` })

    const response = await request(server)
      .get("/api/v1/search/posts")
      .query({ q: marker, hasSource: "true" })
      .expect(200)

    const page = postSearchPageSchema.parse(response.body)
    const [result] = page.items

    expect(page.items.map(({ post }) => post.id)).toEqual([cited.body.id])

    expect(result?.post.sources[0]?.host).toBe("ibge.gov.br")

    expect(result?.highlight).toContain(`${HIGHLIGHT_START}${marker}${HIGHLIGHT_END}`)
  })

  it("finds contributions and topics", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const marker = `contrib${randomBytes(3).toString("hex")}`
    const post = await createPost({ server, token, body: "Post de origem" })

    await createComment({ server, token, postId: post.id, body: `Trago um dado sobre ${marker}` })

    const contributions = await request(server)
      .get("/api/v1/search/contributions")
      .query({ q: marker })
      .expect(200)

    const topics = await request(server)
      .get("/api/v1/search/topics")
      .query({ q: "Mobilidade" })
      .expect(200)

    const [found] = contributionSearchPageSchema.parse(contributions.body).items

    expect(found?.contribution.post.id).toBe(post.id)

    expect(topicListSchema.parse(topics.body).topics.map(({ slug }) => slug)).toContain(
      "mobilidade-urbana",
    )
  })
})
