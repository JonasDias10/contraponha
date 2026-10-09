import type { NestExpressApplication } from "@nestjs/platform-express"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { PushDispatchService } from "#src/modules/push/services/push-dispatch.service.js"
import { bearer, registerAccount, type App } from "./support/accounts.js"
import type { CapturingPushSender } from "./support/capturing-push-sender.js"
import { createComment, createPost } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

let tokenSequence = 0

function newPushToken(): string {
  tokenSequence += 1

  return `ExponentPushToken[test-${Date.now()}-${tokenSequence}]`
}

interface RegisterDeviceParams {
  server: App
  sessionToken: string
  pushToken: string
}

async function registerDevice({
  server,
  sessionToken,
  pushToken,
}: RegisterDeviceParams): Promise<void> {
  await request(server)
    .put("/api/v1/me/push-tokens")
    .set(bearer(sessionToken))
    .send({ token: pushToken, platform: "ios" })
    .expect(204)
}

describe("push notifications", () => {
  let app: NestExpressApplication
  let server: App
  let pushes: CapturingPushSender
  let dispatcher: PushDispatchService

  beforeAll(async () => {
    const testApp = await createTestApp()

    app = testApp.app

    pushes = testApp.pushes

    server = app.getHttpServer()

    dispatcher = app.get(PushDispatchService)
  })

  afterAll(async () => {
    await app.close()
  })

  it("pushes a visible notification once, in the recipient's language, with where to open", async () => {
    const author = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const pushToken = newPushToken()

    await registerDevice({ server, sessionToken: author.auth.session.token, pushToken })

    const post = await createPost({ server, token: author.auth.session.token })

    await createComment({ server, token: reader.auth.session.token, postId: post.id })

    await dispatcher.runOnce()

    await dispatcher.runOnce()

    const [message, ...rest] = pushes.sentTo(pushToken)

    expect(rest).toHaveLength(0)

    expect(message?.body).toContain(reader.input.displayName)

    expect(message?.badge).toBe(1)

    expect(message?.data).toMatchObject({ postId: post.id, actorHandle: reader.input.handle })
  })

  it("waits for the digest hour before pushing", async () => {
    const author = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const pushToken = newPushToken()
    const hourAway = (new Date().getUTCHours() + 12) % 24

    await request(server)
      .patch("/api/v1/notifications/preferences")
      .set(bearer(author.auth.session.token))
      .send({ digestHours: [hourAway] })
      .expect(200)

    await registerDevice({ server, sessionToken: author.auth.session.token, pushToken })

    const post = await createPost({ server, token: author.auth.session.token })

    await createComment({ server, token: reader.auth.session.token, postId: post.id })

    await dispatcher.runOnce()

    expect(pushes.sentTo(pushToken)).toHaveLength(0)
  })

  it("moves a device to whoever signs in on it and forgets it on sign-out", async () => {
    const first = await registerAccount({ server })
    const second = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const pushToken = newPushToken()

    await registerDevice({ server, sessionToken: first.auth.session.token, pushToken })

    await registerDevice({ server, sessionToken: second.auth.session.token, pushToken })

    const firstPost = await createPost({ server, token: first.auth.session.token })

    await createComment({ server, token: reader.auth.session.token, postId: firstPost.id })

    await dispatcher.runOnce()

    expect(pushes.sentTo(pushToken)).toHaveLength(0)

    await request(server)
      .delete(`/api/v1/me/push-tokens/${encodeURIComponent(pushToken)}`)
      .set(bearer(second.auth.session.token))
      .expect(204)

    const secondPost = await createPost({ server, token: second.auth.session.token })

    await createComment({ server, token: reader.auth.session.token, postId: secondPost.id })

    await dispatcher.runOnce()

    expect(pushes.sentTo(pushToken)).toHaveLength(0)
  })

  it("drops tokens the push service reports as unregistered", async () => {
    const author = await registerAccount({ server })
    const reader = await registerAccount({ server })
    const pushToken = newPushToken()

    await registerDevice({ server, sessionToken: author.auth.session.token, pushToken })

    pushes.invalidTokens.add(pushToken)

    const post = await createPost({ server, token: author.auth.session.token })

    await createComment({ server, token: reader.auth.session.token, postId: post.id })

    await dispatcher.runOnce()

    const otherPost = await createPost({ server, token: author.auth.session.token })

    await createComment({ server, token: reader.auth.session.token, postId: otherPost.id })

    await dispatcher.runOnce()

    expect(pushes.sentTo(pushToken)).toHaveLength(1)
  })

  it("rejects tokens that are not Expo push tokens", async () => {
    const { auth } = await registerAccount({ server })

    await request(server)
      .put("/api/v1/me/push-tokens")
      .set(bearer(auth.session.token))
      .send({ token: "not-a-token", platform: "ios" })
      .expect(400)
  })
})
