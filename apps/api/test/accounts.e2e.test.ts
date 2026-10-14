import type { NestExpressApplication } from "@nestjs/platform-express"
import { consents, users } from "@contraponha/database"
import {
  accountDeletionStatusSchema,
  commentPageSchema,
  dataExportDownloadSchema,
  dataExportListSchema,
  dataExportViewSchema,
} from "@contraponha/validation"
import { eq } from "drizzle-orm"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { BackgroundJobsService } from "#src/modules/accounts/services/background-jobs.service.js"

import { bearer, login, registerAccount, type App } from "./support/accounts.js"
import type { CapturingEmailSender } from "./support/capturing-email-sender.js"
import { createComment, createPost, withTestDatabase } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

describe("account and personal data", () => {
  let app: NestExpressApplication
  let server: App
  let emails: CapturingEmailSender
  let jobs: BackgroundJobsService

  beforeAll(async () => {
    const testApp = await createTestApp()

    app = testApp.app

    emails = testApp.emails

    server = app.getHttpServer()

    jobs = app.get(BackgroundJobsService)
  })

  afterAll(async () => {
    await app.close()
  })

  it("records acceptance of every legal document at sign-up", async () => {
    const { auth } = await registerAccount({ server })

    const accepted = await withTestDatabase(({ db }) =>
      db.select().from(consents).where(eq(consents.userId, auth.user.id)),
    )

    expect(accepted.map(({ document }) => document).toSorted()).toEqual([
      "guidelines",
      "privacy",
      "terms",
    ])

    expect(auth.user.birthDate).toBe("1990-05-17")
  })

  it("exports personal data to a private file and emails when it is ready", async () => {
    const { auth, input } = await registerAccount({ server })
    const token = auth.session.token

    await createPost({ server, token, body: "Um post que vai para a exportação" })

    const requested = await request(server)
      .post("/api/v1/me/data-exports")
      .set(bearer(token))
      .send({ format: "json", sections: ["content", "account"] })
      .expect(201)

    const duplicate = await request(server)
      .post("/api/v1/me/data-exports")
      .set(bearer(token))
      .send({ format: "html", sections: ["content"] })
      .expect(409)

    await jobs.runOnce()

    const list = await request(server).get("/api/v1/me/data-exports").set(bearer(token))
    const [ready] = dataExportListSchema.parse(list.body).exports

    const download = await request(server)
      .get(`/api/v1/me/data-exports/${dataExportViewSchema.parse(requested.body).id}/download`)
      .set(bearer(token))
      .expect(200)

    const { url } = dataExportDownloadSchema.parse(download.body)
    const signed = await fetch(url)
    const exported: unknown = await signed.json()
    const unsigned = await fetch(url.split("?")[0] ?? "")

    expect(duplicate.body.error.code).toBe("DATA_EXPORT_IN_PROGRESS")

    expect(ready?.status).toBe("ready")

    expect(emails.lastTo(input.email)?.subject).toBe(
      "Sua exportação de dados do Contraponha está pronta",
    )

    expect(exported).toMatchObject({
      account: { profile: { handle: auth.user.handle } },
      content: { posts: [{ body: "Um post que vai para a exportação" }] },
    })

    expect(unsigned.status).toBe(403)
  })

  it("schedules deletion, signs out everywhere, and cancels when signing in again", async () => {
    const { auth, input } = await registerAccount({ server })
    const token = auth.session.token

    await request(server)
      .put("/api/v1/me/deletion")
      .set(bearer(token))
      .send({ confirmHandle: "outra_pessoa", deleteContributions: false })
      .expect(400)

    const scheduled = await request(server)
      .put("/api/v1/me/deletion")
      .set(bearer(token))
      .send({ confirmHandle: auth.user.handle, deleteContributions: true })
      .expect(200)

    await request(server).get("/api/v1/users/me").set(bearer(token)).expect(401)

    const newToken = await login({ server, email: input.email, password: input.password })
    const me = await request(server).get("/api/v1/users/me").set(bearer(newToken)).expect(200)

    expect(accountDeletionStatusSchema.parse(scheduled.body).scheduledFor).not.toBeNull()

    expect(me.body.deletionScheduledAt).toBeNull()

    expect(emails.lastTo(input.email)?.subject).toBe(
      "A exclusão da sua conta do Contraponha foi cancelada",
    )
  })

  it("erases the account after the grace period and keeps others' discussions readable", async () => {
    const leaving = await registerAccount({ server })
    const other = await registerAccount({ server })
    const otherPost = await createPost({ server, token: other.auth.session.token })
    const ownPost = await createPost({ server, token: leaving.auth.session.token })

    await createComment({ server, token: leaving.auth.session.token, postId: otherPost.id })

    await request(server)
      .put(`/api/v1/users/${other.auth.user.handle}/follow`)
      .set(bearer(leaving.auth.session.token))
      .expect(204)

    await request(server)
      .put("/api/v1/me/deletion")
      .set(bearer(leaving.auth.session.token))
      .send({ confirmHandle: leaving.auth.user.handle, deleteContributions: false })
      .expect(200)

    await withTestDatabase(({ db }) =>
      db
        .update(users)
        .set({ deletionScheduledAt: new Date(Date.now() - 1000) })
        .where(eq(users.id, leaving.auth.user.id)),
    )

    await jobs.runOnce()

    const removedPost = await request(server).get(`/api/v1/posts/${ownPost.id}`).expect(200)
    const comments = await request(server).get(`/api/v1/posts/${otherPost.id}/comments`)
    const [comment] = commentPageSchema.parse(comments.body).items
    const otherProfile = await request(server).get(`/api/v1/users/${other.auth.user.handle}`)

    await request(server).get(`/api/v1/users/${leaving.auth.user.handle}`).expect(404)

    await request(server)
      .post("/api/v1/auth/login")
      .send({ email: leaving.input.email, password: leaving.input.password })
      .expect(401)

    expect(removedPost.body).toMatchObject({ isDeleted: true, body: null })

    expect(comment?.author).toMatchObject({ isDeleted: true, displayName: "" })

    expect(otherProfile.body.followerCount).toBe(0)
  })
})
