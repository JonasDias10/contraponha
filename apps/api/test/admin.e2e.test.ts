import type { NestExpressApplication } from "@nestjs/platform-express"
import {
  adminMetricsSchema,
  adminTopicSchema,
  adminUserDetailSchema,
  adminUserPageSchema,
} from "@contraponha/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  bearer,
  registerAccount,
  setRole,
  type App,
  type RegisteredAccount,
} from "./support/accounts.js"
import { createTestApp } from "./support/create-test-app.js"
import { uploadImage } from "./support/media.js"

interface StaffAccount {
  account: RegisteredAccount
  token: string
}

interface CreateStaffParams {
  server: App
  role: "moderator" | "admin"
}

async function createStaff({ server, role }: CreateStaffParams): Promise<StaffAccount> {
  const account = await registerAccount({ server })

  await setRole({ userId: account.auth.user.id, role })

  return { account, token: account.auth.session.token }
}

function inDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

describe("admin", () => {
  let app: NestExpressApplication
  let server: App
  let moderator: StaffAccount
  let admin: StaffAccount

  beforeAll(async () => {
    const testApp = await createTestApp()

    app = testApp.app

    server = app.getHttpServer()

    moderator = await createStaff({ server, role: "moderator" })

    admin = await createStaff({ server, role: "admin" })
  })

  afterAll(async () => {
    await app.close()
  })

  describe("suspensions", () => {
    it("ends sessions, blocks sign-in until lifted and is audited", async () => {
      const member = await registerAccount({ server })
      const memberToken = member.auth.session.token
      const endsAt = inDays(7)

      const response = await request(server)
        .post(`/api/v1/admin/users/${member.input.handle}/suspensions`)
        .set(bearer(moderator.token))
        .send({ rule: "harassment", note: "Repeated attacks", endsAt })
        .expect(201)

      const detail = adminUserDetailSchema.parse(response.body)

      expect(detail.status).toBe("suspended")

      expect(detail.suspension).toMatchObject({ rule: "harassment", endsAt, isActive: true })

      await request(server).get("/api/v1/users/me").set(bearer(memberToken)).expect(401)

      const blocked = await request(server)
        .post("/api/v1/auth/login")
        .send({ email: member.input.email, password: member.input.password })
        .expect(403)

      expect(blocked.body.error).toMatchObject({
        code: "ACCOUNT_SUSPENDED",
        details: { endsAt },
      })

      const lifted = await request(server)
        .delete(`/api/v1/admin/users/${member.input.handle}/suspension`)
        .set(bearer(moderator.token))
        .expect(200)

      expect(adminUserDetailSchema.parse(lifted.body)).toMatchObject({
        status: "active",
        suspension: null,
      })

      await request(server)
        .post("/api/v1/auth/login")
        .send({ email: member.input.email, password: member.input.password })
        .expect(200)

      const actions = await request(server)
        .get("/api/v1/moderation/actions")
        .set(bearer(moderator.token))
        .expect(200)

      const types = (actions.body.items as { type: string; targetUserId: string }[])
        .filter(({ targetUserId }) => targetUserId === member.auth.user.id)
        .map(({ type }) => type)

      expect(types).toEqual(["suspension_lifted", "user_suspended"])
    })

    it("bans without an end date and does not reveal it to a wrong password", async () => {
      const member = await registerAccount({ server })

      const response = await request(server)
        .post(`/api/v1/admin/users/${member.input.handle}/suspensions`)
        .set(bearer(moderator.token))
        .send({ rule: "spam" })
        .expect(201)

      expect(adminUserDetailSchema.parse(response.body).status).toBe("banned")

      const wrongPassword = await request(server)
        .post("/api/v1/auth/login")
        .send({ email: member.input.email, password: "not the password at all" })
        .expect(401)

      expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS")
    })

    it("only lets someone act on people with a lower role", async () => {
      const otherModerator = await createStaff({ server, role: "moderator" })

      await request(server)
        .post(`/api/v1/admin/users/${otherModerator.account.input.handle}/suspensions`)
        .set(bearer(moderator.token))
        .send({ rule: "spam" })
        .expect(403)

      await request(server)
        .post(`/api/v1/admin/users/${moderator.account.input.handle}/suspensions`)
        .set(bearer(moderator.token))
        .send({ rule: "spam" })
        .expect(403)

      await request(server)
        .post(`/api/v1/admin/users/${otherModerator.account.input.handle}/suspensions`)
        .set(bearer(admin.token))
        .send({ rule: "spam", endsAt: inDays(1) })
        .expect(201)
    })

    it("refuses end dates in the past and members of the public", async () => {
      const member = await registerAccount({ server })

      await request(server)
        .post(`/api/v1/admin/users/${member.input.handle}/suspensions`)
        .set(bearer(moderator.token))
        .send({ rule: "spam", endsAt: inDays(-1) })
        .expect(400)

      await request(server)
        .get("/api/v1/admin/users")
        .set(bearer(member.auth.session.token))
        .expect(403)
    })
  })

  describe("users", () => {
    it("searches by @ and filters by status", async () => {
      const member = await registerAccount({ server })

      await request(server)
        .post(`/api/v1/admin/users/${member.input.handle}/suspensions`)
        .set(bearer(moderator.token))
        .send({ rule: "spam", endsAt: inDays(3) })
        .expect(201)

      const found = await request(server)
        .get("/api/v1/admin/users")
        .query({ q: member.input.handle, status: "suspended" })
        .set(bearer(moderator.token))
        .expect(200)

      const page = adminUserPageSchema.parse(found.body)

      expect(page.items.map(({ user }) => user.handle)).toEqual([member.input.handle])

      const active = await request(server)
        .get("/api/v1/admin/users")
        .query({ q: member.input.handle, status: "active" })
        .set(bearer(moderator.token))
        .expect(200)

      expect(adminUserPageSchema.parse(active.body).items).toHaveLength(0)
    })

    it("removes a profile photo", async () => {
      const member = await registerAccount({ server })
      const token = member.auth.session.token
      const mediaId = await uploadImage({ server, token, purpose: "avatar" })

      await request(server)
        .put("/api/v1/users/me/avatar")
        .set(bearer(token))
        .send({ mediaId })
        .expect(200)

      const response = await request(server)
        .delete(`/api/v1/admin/users/${member.input.handle}/avatar`)
        .set(bearer(moderator.token))
        .expect(200)

      expect(adminUserDetailSchema.parse(response.body).user.avatarUrl).toBeNull()
    })
  })

  describe("metrics", () => {
    it("returns totals and one entry per day", async () => {
      const response = await request(server)
        .get("/api/v1/admin/metrics")
        .query({ days: 7 })
        .set(bearer(moderator.token))
        .expect(200)

      const metrics = adminMetricsSchema.parse(response.body)
      const today = new Date().toISOString().slice(0, 10)

      expect(metrics.daily).toHaveLength(7)

      expect(metrics.daily.at(-1)?.date).toBe(today)

      expect(metrics.daily.at(-1)?.signups).toBeGreaterThan(0)

      expect(metrics.totals.users).toBeGreaterThan(0)
    })
  })

  describe("topics", () => {
    it("lets admins create, rename and curate topics", async () => {
      const slug = `tema-${Date.now()}`

      const created = await request(server)
        .post("/api/v1/admin/topics")
        .set(bearer(admin.token))
        .send({ name: "Tema novo", slug, isCurated: false })
        .expect(201)

      expect(adminTopicSchema.parse(created.body)).toMatchObject({ slug, isCurated: false })

      await request(server)
        .post("/api/v1/admin/topics")
        .set(bearer(admin.token))
        .send({ name: "Outro", slug })
        .expect(409)

      const updated = await request(server)
        .patch(`/api/v1/admin/topics/${slug}`)
        .set(bearer(admin.token))
        .send({ name: "Tema renomeado", isCurated: true })
        .expect(200)

      expect(adminTopicSchema.parse(updated.body)).toMatchObject({
        name: "Tema renomeado",
        isCurated: true,
      })

      const curated = await request(server).get("/api/v1/topics").expect(200)

      expect(JSON.stringify(curated.body)).toContain(slug)

      await request(server)
        .patch(`/api/v1/admin/topics/${slug}`)
        .set(bearer(moderator.token))
        .send({ isCurated: false })
        .expect(403)
    })
  })
})
