import type { NestExpressApplication } from "@nestjs/platform-express"
import { AVATAR_MAX_BYTES } from "@contraponha/config"
import { privateProfileSchema } from "@contraponha/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createTestApp } from "./support/create-test-app.js"
import { uploadImage } from "./support/media.js"

describe("profile photo", () => {
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

  interface SetAvatarParams {
    token: string
    mediaId: string
  }

  const setAvatar = ({ token, mediaId }: SetAvatarParams): request.Test =>
    request(server).put("/api/v1/users/me/avatar").set(bearer(token)).send({ mediaId })

  const avatarUrlOf = (body: unknown): string => privateProfileSchema.parse(body).avatarUrl ?? ""

  it("sets a public photo shown on the profile", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const mediaId = await uploadImage({ server, token, purpose: "avatar" })

    const response = await setAvatar({ token, mediaId }).expect(200)
    const profile = privateProfileSchema.parse(response.body)

    expect(profile.avatarUrl).toContain("/avatars/")

    const served = await fetch(profile.avatarUrl ?? "")

    expect(served.status).toBe(200)

    const publicProfile = await request(server).get(`/api/v1/users/${auth.user.handle}`).expect(200)

    expect(publicProfile.body.avatarUrl).toBe(profile.avatarUrl)
  })

  it("replaces the previous photo and deletes it from storage", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const first = await uploadImage({ server, token, purpose: "avatar" })
    const firstResponse = await setAvatar({ token, mediaId: first }).expect(200)
    const second = await uploadImage({ server, token, purpose: "avatar" })
    const secondResponse = await setAvatar({ token, mediaId: second }).expect(200)

    expect(avatarUrlOf(secondResponse.body)).not.toBe(avatarUrlOf(firstResponse.body))

    const oldPhoto = await fetch(avatarUrlOf(firstResponse.body))

    expect(oldPhoto.status).toBe(404)
  })

  it("removes the photo", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token
    const mediaId = await uploadImage({ server, token, purpose: "avatar" })
    const setResponse = await setAvatar({ token, mediaId }).expect(200)

    const response = await request(server)
      .delete("/api/v1/users/me/avatar")
      .set(bearer(token))
      .expect(200)

    expect(response.body.avatarUrl).toBeNull()

    const removed = await fetch(avatarUrlOf(setResponse.body))

    expect(removed.status).toBe(404)
  })

  it("refuses post uploads, other people's uploads and reused photos", async () => {
    const { auth } = await registerAccount({ server })
    const { auth: other } = await registerAccount({ server })
    const token = auth.session.token
    const postUpload = await uploadImage({ server, token })

    const wrongPurpose = await setAvatar({ token, mediaId: postUpload }).expect(400)

    expect(wrongPurpose.body.error.code).toBe("MEDIA_INVALID")

    const othersUpload = await uploadImage({
      server,
      token: other.session.token,
      purpose: "avatar",
    })

    await setAvatar({ token, mediaId: othersUpload }).expect(400)

    const mediaId = await uploadImage({ server, token, purpose: "avatar" })

    await setAvatar({ token, mediaId }).expect(200)

    await setAvatar({ token, mediaId }).expect(400)
  })

  it("does not accept photo uploads over the avatar limit or attached to posts", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token

    await request(server)
      .post("/api/v1/media/uploads")
      .set(bearer(token))
      .send({ mimeType: "image/png", sizeBytes: AVATAR_MAX_BYTES + 1, purpose: "avatar" })
      .expect(400)

    const avatarUpload = await uploadImage({ server, token, purpose: "avatar" })

    await request(server)
      .post("/api/v1/posts")
      .set(bearer(token))
      .send({ body: "Com imagem", mediaIds: [avatarUpload] })
      .expect(400)
  })
})
