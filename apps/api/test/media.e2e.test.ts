import type { NestExpressApplication } from "@nestjs/platform-express"
import { MEDIA_MAX_BYTES } from "@contraponha/config"
import { postViewSchema } from "@contraponha/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createTestApp } from "./support/create-test-app.js"
import { PNG_BYTES, putObject, requestUpload, uploadImage } from "./support/media.js"

describe("media", () => {
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

  it("uploads an image, attaches it to a post and serves it publicly", async () => {
    const { auth } = await registerAccount({ server })
    const mediaId = await uploadImage({ server, token: auth.session.token })

    const response = await request(server)
      .post("/api/v1/posts")
      .set(bearer(auth.session.token))
      .send({ body: "Com imagem", mediaIds: [mediaId] })
      .expect(201)

    const post = postViewSchema.parse(response.body)
    const [media] = post.media

    expect(post.media).toHaveLength(1)

    expect(media).toMatchObject({
      id: mediaId,
      mimeType: "image/webp",
      width: 4,
      height: 4,
      variants: [{ width: 4, height: 4 }],
    })

    const served = await fetch(media?.url ?? "")
    const servedBody = await served.arrayBuffer()
    const servedBytes = Buffer.from(servedBody)

    expect(served.status).toBe(200)

    expect(served.headers.get("content-type")).toBe("image/webp")

    expect(servedBytes.subarray(8, 12).toString("ascii")).toBe("WEBP")
  })

  it("deletes the original upload once the variants exist", async () => {
    const { auth } = await registerAccount({ server })

    const ticket = await requestUpload({
      server,
      token: auth.session.token,
      sizeBytes: PNG_BYTES.length,
    })

    await putObject({ ticket, content: PNG_BYTES })

    await request(server)
      .post("/api/v1/posts")
      .set(bearer(auth.session.token))
      .send({ body: "Com imagem", mediaIds: [ticket.mediaId] })
      .expect(201)

    const original = await fetch(ticket.uploadUrl.split("?")[0] ?? "")

    expect([403, 404]).toContain(original.status)
  })

  it("refuses files that are not decodable images", async () => {
    const { auth } = await registerAccount({ server })
    const broken = Buffer.concat([PNG_BYTES.subarray(0, 16), Buffer.alloc(40)])
    const mediaId = await uploadImage({ server, token: auth.session.token, content: broken })

    const response = await request(server)
      .post("/api/v1/posts")
      .set(bearer(auth.session.token))
      .send({ body: "Com imagem", mediaIds: [mediaId] })
      .expect(400)

    expect(response.body.error.code).toBe("MEDIA_INVALID")
  })

  it("validates type and size before issuing an upload URL", async () => {
    const { auth } = await registerAccount({ server })

    await request(server)
      .post("/api/v1/media/uploads")
      .set(bearer(auth.session.token))
      .send({ mimeType: "image/gif", sizeBytes: 100 })
      .expect(400)

    await request(server)
      .post("/api/v1/media/uploads")
      .set(bearer(auth.session.token))
      .send({ mimeType: "image/png", sizeBytes: MEDIA_MAX_BYTES + 1 })
      .expect(400)

    await request(server)
      .post("/api/v1/media/uploads")
      .send({ mimeType: "image/png", sizeBytes: 100 })
      .expect(401)
  })

  it("has the storage reject uploads that differ from what was declared", async () => {
    const { auth } = await registerAccount({ server })

    const ticket = await requestUpload({
      server,
      token: auth.session.token,
      sizeBytes: PNG_BYTES.length,
    })

    const biggerBody = await putObject({ ticket, content: Buffer.concat([PNG_BYTES, PNG_BYTES]) })

    expect(biggerBody).toBe(403)
  })

  it("rejects a file disguised as an image", async () => {
    const { auth } = await registerAccount({ server })
    const html = Buffer.from("<html><script>alert(1)</script></html>")
    const mediaId = await uploadImage({ server, token: auth.session.token, content: html })

    const response = await request(server)
      .post("/api/v1/posts")
      .set(bearer(auth.session.token))
      .send({ body: "Arquivo falso", mediaIds: [mediaId] })
      .expect(400)

    expect(response.body.error.code).toBe("MEDIA_INVALID")
  })

  it("rejects media that was never uploaded, belongs to someone else or is already attached", async () => {
    const owner = await registerAccount({ server })
    const stranger = await registerAccount({ server })
    const token = owner.auth.session.token
    const neverUploaded = await requestUpload({ server, token, sizeBytes: PNG_BYTES.length })
    const uploaded = await uploadImage({ server, token })

    const attempts = [
      { token, mediaIds: [neverUploaded.mediaId] },
      { token: stranger.auth.session.token, mediaIds: [uploaded] },
    ]

    for (const attempt of attempts) {
      const response = await request(server)
        .post("/api/v1/posts")
        .set(bearer(attempt.token))
        .send({ body: "Tentativa", mediaIds: attempt.mediaIds })
        .expect(400)

      expect(response.body.error.code).toBe("MEDIA_INVALID")
    }

    await request(server)
      .post("/api/v1/posts")
      .set(bearer(token))
      .send({ body: "Primeiro uso", mediaIds: [uploaded] })
      .expect(201)

    await request(server)
      .post("/api/v1/posts")
      .set(bearer(token))
      .send({ body: "Reuso", mediaIds: [uploaded] })
      .expect(400)
  })

  it("keeps the order of attached images and deletes them with the post", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const first = await uploadImage({ server, token })
    const second = await uploadImage({ server, token })

    const created = await request(server)
      .post("/api/v1/posts")
      .set(bearer(token))
      .send({ body: "Duas imagens", mediaIds: [second, first] })
      .expect(201)

    const post = postViewSchema.parse(created.body)

    expect(post.media.map(({ id }) => id)).toEqual([second, first])

    await request(server).delete(`/api/v1/posts/${post.id}`).set(bearer(token)).expect(204)

    const removed = await request(server).get(`/api/v1/posts/${post.id}`).expect(200)
    const servedAfterRemoval = await fetch(post.media[0]?.url ?? "")

    expect(removed.body.media).toEqual([])

    expect(servedAfterRemoval.status).toBe(404)
  })
})
