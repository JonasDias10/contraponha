import type { NestExpressApplication } from "@nestjs/platform-express"
import { UserRole, type ModerationActionView, type ReportView } from "@contraponha/types"
import {
  moderationActionPageSchema,
  notificationPageSchema,
  privateProfileSchema,
  reportPageSchema,
  reportViewSchema,
} from "@contraponha/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, setRole, type App } from "./support/accounts.js"
import { createComment, createPost, getPost, listPostComments } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

interface StaffParams {
  server: App
  role: UserRole
}

interface ReportParams {
  server: App
  token: string
  targetType: string
  targetId: string
}

interface ListParams {
  server: App
  token: string
  status?: string
}

async function registerStaff({ server, role }: StaffParams): Promise<string> {
  const { auth } = await registerAccount({ server })

  await setRole({ userId: auth.user.id, role })

  return auth.session.token
}

async function report({ server, token, targetType, targetId }: ReportParams): Promise<ReportView> {
  const response = await request(server)
    .post("/api/v1/reports")
    .set(bearer(token))
    .send({ targetType, targetId, reason: "spam", details: "Propaganda repetida" })
    .expect(201)

  return reportViewSchema.parse(response.body)
}

async function listReports({ server, token, status }: ListParams): Promise<ReportView[]> {
  const response = await request(server)
    .get("/api/v1/moderation/reports")
    .query({ status, limit: 50 })
    .set(bearer(token))
    .expect(200)

  return reportPageSchema.parse(response.body).items
}

async function listActions({ server, token }: ListParams): Promise<ModerationActionView[]> {
  const response = await request(server)
    .get("/api/v1/moderation/actions")
    .query({ limit: 50 })
    .set(bearer(token))
    .expect(200)

  return moderationActionPageSchema.parse(response.body).items
}

describe("moderation", () => {
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

  it("accepts one open report per person and target", async () => {
    const author = await registerAccount({ server })
    const reporter = await registerAccount({ server })
    const post = await createPost({ server, token: author.auth.session.token })
    const token = reporter.auth.session.token

    const created = await report({ server, token, targetType: "post", targetId: post.id })

    expect(created).toMatchObject({ targetId: post.id, status: "open", resolvedAt: null })

    const duplicate = await request(server)
      .post("/api/v1/reports")
      .set(bearer(token))
      .send({ targetType: "post", targetId: post.id, reason: "hate" })
      .expect(409)

    expect(duplicate.body.error.code).toBe("DUPLICATE_REPORT")

    await request(server)
      .post("/api/v1/reports")
      .set(bearer(token))
      .send({ targetType: "comment", targetId: post.id, reason: "spam" })
      .expect(404)

    await request(server)
      .post("/api/v1/reports")
      .send({ targetType: "post", targetId: post.id, reason: "spam" })
      .expect(401)
  })

  it("keeps moderation routes away from members", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token

    await request(server).get("/api/v1/moderation/reports").set(bearer(token)).expect(403)

    await request(server).get("/api/v1/moderation/actions").expect(401)
  })

  it("removes reported content and records who did it", async () => {
    const author = await registerAccount({ server })
    const reporter = await registerAccount({ server })
    const moderatorToken = await registerStaff({ server, role: UserRole.MODERATOR })
    const post = await createPost({ server, token: author.auth.session.token })

    const opened = await report({
      server,
      token: reporter.auth.session.token,
      targetType: "post",
      targetId: post.id,
    })

    const openReports = await listReports({ server, token: moderatorToken })

    expect(openReports.map(({ id }) => id)).toContain(opened.id)

    await request(server)
      .post(`/api/v1/moderation/reports/${opened.id}/resolve`)
      .set(bearer(moderatorToken))
      .send({ resolution: "remove_content", rule: "spam", note: "Spam confirmado" })
      .expect(204)

    const removed = await getPost({ server, postId: post.id })
    const resolved = await listReports({ server, token: moderatorToken, status: "resolved" })
    const actions = await listActions({ server, token: moderatorToken })

    const forReport = actions.find(({ reportId }) => reportId === opened.id)

    expect(removed).toMatchObject({ body: null, removedBy: "moderation" })

    expect(resolved.find(({ id }) => id === opened.id)?.resolvedAt).not.toBeNull()

    expect(forReport).toMatchObject({
      type: "report_resolved",
      postId: post.id,
      note: "Spam confirmado",
    })

    await request(server)
      .post(`/api/v1/moderation/reports/${opened.id}/resolve`)
      .set(bearer(moderatorToken))
      .send({ resolution: "dismiss" })
      .expect(409)
  })

  it("dismisses reports without touching the content", async () => {
    const author = await registerAccount({ server })
    const reporter = await registerAccount({ server })
    const moderatorToken = await registerStaff({ server, role: UserRole.MODERATOR })
    const post = await createPost({ server, token: author.auth.session.token })

    const opened = await report({
      server,
      token: reporter.auth.session.token,
      targetType: "post",
      targetId: post.id,
    })

    await request(server)
      .post(`/api/v1/moderation/reports/${opened.id}/resolve`)
      .set(bearer(moderatorToken))
      .send({ resolution: "dismiss" })
      .expect(204)

    const kept = await getPost({ server, postId: post.id })
    const dismissed = await listReports({ server, token: moderatorToken, status: "dismissed" })

    expect(kept.removedBy).toBeNull()

    expect(dismissed.map(({ id }) => id)).toContain(opened.id)
  })

  it("does not remove accounts through reports", async () => {
    const target = await registerAccount({ server })
    const reporter = await registerAccount({ server })
    const moderatorToken = await registerStaff({ server, role: UserRole.MODERATOR })

    const opened = await report({
      server,
      token: reporter.auth.session.token,
      targetType: "user",
      targetId: target.auth.user.id,
    })

    await request(server)
      .post(`/api/v1/moderation/reports/${opened.id}/resolve`)
      .set(bearer(moderatorToken))
      .send({ resolution: "remove_content", rule: "harassment" })
      .expect(400)
  })

  it("removes comments directly", async () => {
    const author = await registerAccount({ server })
    const moderatorToken = await registerStaff({ server, role: UserRole.MODERATOR })
    const post = await createPost({ server, token: author.auth.session.token })

    const comment = await createComment({
      server,
      token: author.auth.session.token,
      postId: post.id,
    })

    await createComment({
      server,
      token: author.auth.session.token,
      postId: post.id,
      parentId: comment.id,
    })

    await request(server)
      .post(`/api/v1/moderation/comments/${comment.id}/remove`)
      .set(bearer(moderatorToken))
      .send({ rule: "personal_attack" })
      .expect(204)

    const comments = await listPostComments({ server, id: post.id })

    expect(comments.items[0]).toMatchObject({ body: null, removedBy: "moderation" })
  })

  it("lets only admins change roles, never their own", async () => {
    const member = await registerAccount({ server })
    const moderatorToken = await registerStaff({ server, role: UserRole.MODERATOR })
    const admin = await registerAccount({ server })
    const path = `/api/v1/moderation/users/${member.auth.user.handle}/role`

    await setRole({ userId: admin.auth.user.id, role: UserRole.ADMIN })

    await request(server)
      .put(path)
      .set(bearer(moderatorToken))
      .send({ role: "moderator" })
      .expect(403)

    await request(server)
      .put(path)
      .set(bearer(admin.auth.session.token))
      .send({ role: "moderator" })
      .expect(204)

    const me = await request(server)
      .get("/api/v1/users/me")
      .set(bearer(member.auth.session.token))
      .expect(200)

    expect(privateProfileSchema.parse(me.body).role).toBe("moderator")

    // The new moderator still needs two-step verification before the tools open.
    const withoutTwoFactor = await request(server)
      .get("/api/v1/moderation/reports")
      .set(bearer(member.auth.session.token))
      .expect(403)

    expect(withoutTwoFactor.body.error.code).toBe("TWO_FACTOR_REQUIRED")

    await request(server)
      .put(`/api/v1/moderation/users/${admin.auth.user.handle}/role`)
      .set(bearer(admin.auth.session.token))
      .send({ role: "member" })
      .expect(400)
  })

  it("tells the author and every reporter which rule was applied", async () => {
    const author = await registerAccount({ server })
    const firstReporter = await registerAccount({ server })
    const secondReporter = await registerAccount({ server })
    const reporters = [firstReporter, secondReporter]
    const moderatorToken = await registerStaff({ server, role: UserRole.MODERATOR })
    const post = await createPost({ server, token: author.auth.session.token })
    const reports: ReportView[] = []

    for (const reporter of reporters) {
      const created = await report({
        server,
        token: reporter.auth.session.token,
        targetType: "post",
        targetId: post.id,
      })

      reports.push(created)
    }

    await request(server)
      .post(`/api/v1/moderation/reports/${reports[0]?.id}/resolve`)
      .set(bearer(moderatorToken))
      .send({ resolution: "remove_content", rule: "misinformation" })
      .expect(204)

    const removed = await getPost({ server, postId: post.id })
    const resolved = await listReports({ server, token: moderatorToken, status: "resolved" })

    const authorInbox = await request(server)
      .get("/api/v1/notifications")
      .query({ filter: "moderation" })
      .set(bearer(author.auth.session.token))

    const reporterInbox = await request(server)
      .get("/api/v1/notifications")
      .set(bearer(secondReporter.auth.session.token))

    expect(removed.removalRule).toBe("misinformation")

    expect(resolved.map(({ id }) => id)).toEqual(
      expect.arrayContaining(reports.map(({ id }) => id)),
    )

    expect(notificationPageSchema.parse(authorInbox.body).items[0]).toMatchObject({
      type: "content_removed",
      actors: [],
      moderation: { rule: "misinformation", wasRemoved: true },
    })

    expect(notificationPageSchema.parse(reporterInbox.body).items[0]).toMatchObject({
      type: "report_resolved",
      moderation: { rule: "misinformation", wasRemoved: true },
    })
  })

  it("adds and retires context notes above a post", async () => {
    const author = await registerAccount({ server })
    const moderatorToken = await registerStaff({ server, role: UserRole.MODERATOR })
    const post = await createPost({ server, token: author.auth.session.token })

    await request(server)
      .put(`/api/v1/moderation/posts/${post.id}/context`)
      .set(bearer(author.auth.session.token))
      .send({ body: "Contexto" })
      .expect(403)

    await request(server)
      .put(`/api/v1/moderation/posts/${post.id}/context`)
      .set(bearer(moderatorToken))
      .send({
        body: "O estudo citado avaliou só escolas de tempo integral.",
        sources: [{ url: "https://www.inep.gov.br/estudo" }],
      })
      .expect(200)

    const withNote = await getPost({ server, postId: post.id })

    await request(server)
      .delete(`/api/v1/moderation/posts/${post.id}/context`)
      .set(bearer(moderatorToken))
      .expect(204)

    const withoutNote = await getPost({ server, postId: post.id })

    expect(withNote.contextNote).toMatchObject({
      body: "O estudo citado avaliou só escolas de tempo integral.",
      sources: [{ host: "inep.gov.br" }],
    })

    expect(withoutNote.contextNote).toBeNull()
  })
})
