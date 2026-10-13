import type { NestExpressApplication } from "@nestjs/platform-express"
import { postViewSchema } from "@contraponha/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createTestApp } from "./support/create-test-app.js"
import type { FakeRemoteFetcher } from "./support/fake-remote-fetcher.js"
import { PNG_BYTES } from "./support/media.js"

const POLL_MS = 50
const POLL_LIMIT = 40

interface WaitForPreviewParams {
  server: App
  postId: string
}

async function waitForPreview({ server, postId }: WaitForPreviewParams): Promise<unknown> {
  for (let attempt = 0; attempt < POLL_LIMIT; attempt += 1) {
    const response = await request(server).get(`/api/v1/posts/${postId}`).expect(200)
    const post = postViewSchema.parse(response.body)

    if (post.linkPreview) return post.linkPreview

    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }

  return null
}

describe("link previews", () => {
  let app: NestExpressApplication
  let server: App
  let remote: FakeRemoteFetcher

  beforeAll(async () => {
    const testApp = await createTestApp()

    app = testApp.app

    remote = testApp.remote

    server = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
  })

  it("reads the first link's Open Graph data and serves a copy of its image", async () => {
    const page = `https://jornal.example/materia-${Date.now()}`

    remote.respond({
      url: page,
      response: {
        contentType: "text/html; charset=utf-8",
        body: `<head><meta property="og:title" content="Reforma tributária">
        <meta property="og:description" content="O que muda">
        <meta property="og:site_name" content="Jornal">
        <meta property="og:image" content="${page}/capa.png"></head>`,
      },
    })

    remote.respond({
      url: `${page}/capa.png`,
      response: { contentType: "image/png", body: PNG_BYTES },
    })

    const { auth } = await registerAccount({ server })

    const created = await request(server)
      .post("/api/v1/posts")
      .set(bearer(auth.session.token))
      .send({ body: `Vale ler: ${page}.` })
      .expect(201)

    const preview = await waitForPreview({ server, postId: created.body.id })

    expect(preview).toMatchObject({
      url: page,
      title: "Reforma tributária",
      description: "O que muda",
      siteName: "Jornal",
      imageWidth: 4,
    })

    const imageUrl = (preview as { imageUrl: string }).imageUrl

    expect(imageUrl).toContain("/posts/previews/")

    const image = await fetch(imageUrl)

    expect(image.headers.get("content-type")).toBe("image/webp")
  })

  it("shows nothing for links that cannot be read", async () => {
    const { auth } = await registerAccount({ server })

    const created = await request(server)
      .post("/api/v1/posts")
      .set(bearer(auth.session.token))
      .send({ body: "Fora do ar: https://quebrado.example/x" })
      .expect(201)

    await new Promise((resolve) => setTimeout(resolve, 200))

    const response = await request(server).get(`/api/v1/posts/${created.body.id}`).expect(200)

    expect(response.body.linkPreview).toBeNull()
  })
})
