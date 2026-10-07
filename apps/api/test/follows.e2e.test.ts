import type { NestExpressApplication } from "@nestjs/platform-express"
import type { PublicProfile } from "@contraponha/types"
import {
  followedAmongSchema,
  followStatusSchema,
  profilePageSchema,
  publicProfileSchema,
} from "@contraponha/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createTestApp } from "./support/create-test-app.js"

interface ProfileParams {
  server: App
  handle: string
}

async function getProfile({ server, handle }: ProfileParams): Promise<PublicProfile> {
  const response = await request(server).get(`/api/v1/users/${handle}`).expect(200)
  return publicProfileSchema.parse(response.body)
}

describe("follows", () => {
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

  it("follows idempotently and keeps both profiles' counters in sync", async () => {
    const follower = await registerAccount({ server })
    const followee = await registerAccount({ server })
    const path = `/api/v1/users/${followee.auth.user.handle}/follow`
    const token = follower.auth.session.token

    await request(server).put(path).set(bearer(token)).expect(204)

    await request(server).put(path).set(bearer(token)).expect(204)

    const followeeProfile = await getProfile({ server, handle: followee.auth.user.handle })
    const followerProfile = await getProfile({ server, handle: follower.auth.user.handle })
    const status = await request(server).get(path).set(bearer(token)).expect(200)

    expect(followeeProfile.followerCount).toBe(1)

    expect(followerProfile.followingCount).toBe(1)

    expect(followStatusSchema.parse(status.body)).toEqual({ isFollowing: true })

    await request(server).delete(path).set(bearer(token)).expect(204)

    await request(server).delete(path).set(bearer(token)).expect(204)

    const afterUnfollow = await getProfile({ server, handle: followee.auth.user.handle })
    const statusAfter = await request(server).get(path).set(bearer(token)).expect(200)

    expect(afterUnfollow.followerCount).toBe(0)

    expect(statusAfter.body).toEqual({ isFollowing: false })
  })

  it("handles people following each other at the same moment", async () => {
    for (let round = 0; round < 10; round += 1) {
      const first = await registerAccount({ server })
      const second = await registerAccount({ server })

      const responses = await Promise.all([
        request(server)
          .put(`/api/v1/users/${second.auth.user.handle}/follow`)
          .set(bearer(first.auth.session.token)),
        request(server)
          .put(`/api/v1/users/${first.auth.user.handle}/follow`)
          .set(bearer(second.auth.session.token)),
      ])

      const firstProfile = await getProfile({ server, handle: first.auth.user.handle })

      expect(responses.map((response) => response.status)).toEqual([204, 204])

      expect(firstProfile).toMatchObject({ followerCount: 1, followingCount: 1 })
    }
  })

  it("refuses self-follows and unknown users", async () => {
    const { auth } = await registerAccount({ server })
    const token = auth.session.token

    const selfFollow = await request(server)
      .put(`/api/v1/users/${auth.user.handle}/follow`)
      .set(bearer(token))
      .expect(400)

    expect(selfFollow.body.error.code).toBe("SELF_FOLLOW_NOT_ALLOWED")

    await request(server)
      .put("/api/v1/users/nobody_to_follow/follow")
      .set(bearer(token))
      .expect(404)

    await request(server).put(`/api/v1/users/${auth.user.handle}/follow`).expect(401)
  })

  it("pages through followers and following, most recent first", async () => {
    const target = await registerAccount({ server })

    const firstFollower = await registerAccount({ server })
    const secondFollower = await registerAccount({ server })
    const thirdFollower = await registerAccount({ server })
    const followers = [firstFollower, secondFollower, thirdFollower]

    for (const follower of followers) {
      await request(server)
        .put(`/api/v1/users/${target.auth.user.handle}/follow`)
        .set(bearer(follower.auth.session.token))
        .expect(204)
    }

    const firstResponse = await request(server)
      .get(`/api/v1/users/${target.auth.user.handle}/followers`)
      .query({ limit: 2 })
      .expect(200)

    const firstPage = profilePageSchema.parse(firstResponse.body)

    const secondResponse = await request(server)
      .get(`/api/v1/users/${target.auth.user.handle}/followers`)
      .query({ limit: 2, cursor: firstPage.nextCursor })
      .expect(200)

    const secondPage = profilePageSchema.parse(secondResponse.body)

    const followingResponse = await request(server)
      .get(`/api/v1/users/${firstFollower.auth.user.handle}/following`)
      .expect(200)

    const expectedOrder = followers.map(({ auth }) => auth.user.handle).toReversed()

    expect([...firstPage.items, ...secondPage.items].map((profile) => profile.handle)).toEqual(
      expectedOrder,
    )

    expect(secondPage.nextCursor).toBeNull()

    expect(profilePageSchema.parse(followingResponse.body).items).toMatchObject([
      { handle: target.auth.user.handle },
    ])
  })

  it("tells which people in a list the reader already follows", async () => {
    const reader = await registerAccount({ server })
    const followed = await registerAccount({ server })
    const other = await registerAccount({ server })

    await request(server)
      .put(`/api/v1/users/${followed.auth.user.handle}/follow`)
      .set(bearer(reader.auth.session.token))
      .expect(204)

    const response = await request(server)
      .get("/api/v1/follows/status")
      .query({ userIds: `${followed.auth.user.id},${other.auth.user.id}` })
      .set(bearer(reader.auth.session.token))
      .expect(200)

    expect(followedAmongSchema.parse(response.body).userIds).toEqual([followed.auth.user.id])

    await request(server)
      .get("/api/v1/follows/status")
      .query({ userIds: "not-a-uuid" })
      .set(bearer(reader.auth.session.token))
      .expect(400)
  })
})
