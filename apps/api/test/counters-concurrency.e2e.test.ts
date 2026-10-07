import type { NestExpressApplication } from "@nestjs/platform-express"
import { sql } from "drizzle-orm"
import { REACTIONS_PER_TARGET_MAX } from "@contraponha/config"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App, type RegisteredAccount } from "./support/accounts.js"
import { createComment, createPost, withTestDatabase } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

const PARTICIPANTS = 6

// More requests in flight than the API's database pool (10 connections) keeps every write
// contending, while staying under the OS listen backlog (128 on macOS) that drops extra sockets.
const MAX_IN_FLIGHT = 32

type CounterMismatch = {
  entity: string
  id: string
  stored: number
  actual: number
}

interface FindMismatchesParams {
  postId: string
  commentId: string
  userIds: string[]
}

type OverLimitReactionRow = {
  user_id: string
}

type Operation = () => Promise<request.Response>

interface RunConcurrentlyParams {
  operations: Operation[]
  limit: number
}

async function runConcurrently({
  operations,
  limit,
}: RunConcurrentlyParams): Promise<request.Response[]> {
  const responses: request.Response[] = []
  let next = 0

  async function worker(): Promise<void> {
    while (next < operations.length) {
      const operation = operations[next]

      next += 1

      if (!operation) return

      const response = await operation()

      responses.push(response)
    }
  }

  await Promise.all(Array.from({ length: limit }, worker))

  return responses
}

function shuffle<TItem>(items: TItem[]): TItem[] {
  return items
    .map((item) => ({ item, order: Math.random() }))
    .sort((first, second) => first.order - second.order)
    .map(({ item }) => item)
}

function findMismatches({
  postId,
  commentId,
  userIds,
}: FindMismatchesParams): Promise<CounterMismatch[]> {
  return withTestDatabase(async ({ db }) => {
    const result = await db.execute<CounterMismatch>(sql`
      with expected as (
        select 'post.comment_count' as entity, p.id::text as id, p.comment_count as stored,
          (select count(*) from comments c where c.post_id = p.id and c.deleted_at is null)::int as actual
        from posts p where p.id = ${postId}
        union all
        select 'post.' || k.kind || '_count', p.id::text,
          case k.kind
            when 'good_argument' then p.good_argument_count
            when 'insightful' then p.insightful_count
            when 'changed_my_mind' then p.changed_my_mind_count
            else p.needs_source_count
          end,
          (select count(*) from reactions r where r.post_id = p.id and r.kind::text = k.kind)::int
        from posts p
        cross join (values ('good_argument'), ('insightful'), ('changed_my_mind'), ('needs_source')) as k(kind)
        where p.id = ${postId}
        union all
        select 'comment.reply_count', c.id::text, c.reply_count,
          (select count(*) from comments r where r.parent_id = c.id and r.deleted_at is null)::int
        from comments c where c.id = ${commentId}
        union all
        select 'comment.' || k.kind || '_count', c.id::text,
          case k.kind
            when 'good_argument' then c.good_argument_count
            when 'insightful' then c.insightful_count
            when 'changed_my_mind' then c.changed_my_mind_count
            else c.needs_source_count
          end,
          (select count(*) from reactions r where r.comment_id = c.id and r.kind::text = k.kind)::int
        from comments c
        cross join (values ('good_argument'), ('insightful'), ('changed_my_mind'), ('needs_source')) as k(kind)
        where c.id = ${commentId}
        union all
        select 'user.follower_count', u.id::text, u.follower_count,
          (select count(*) from follows f where f.followee_id = u.id)::int
        from users u where u.id = any(${`{${userIds.join(",")}}`}::uuid[])
        union all
        select 'user.following_count', u.id::text, u.following_count,
          (select count(*) from follows f where f.follower_id = u.id)::int
        from users u where u.id = any(${`{${userIds.join(",")}}`}::uuid[])
      )
      select * from expected where stored <> actual
    `)

    return result.rows
  })
}

function findOverLimitReactions(postId: string): Promise<OverLimitReactionRow[]> {
  return withTestDatabase(async ({ db }) => {
    const result = await db.execute<OverLimitReactionRow>(sql`
      select user_id from reactions
      where post_id = ${postId}
      group by user_id
      having count(*) > ${REACTIONS_PER_TARGET_MAX}
    `)

    return result.rows
  })
}

describe("counters under concurrent writes", () => {
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

  it("keeps every counter equal to its source rows and the per-person reaction limit", async () => {
    const people: RegisteredAccount[] = []

    for (let index = 0; index < PARTICIPANTS; index += 1) {
      const account = await registerAccount({ server })

      people.push(account)
    }

    const [owner] = people

    if (!owner) throw new Error("No participants")

    const post = await createPost({ server, token: owner.auth.session.token })
    const thread = await createComment({ server, token: owner.auth.session.token, postId: post.id })
    const existingReplies = []

    for (const person of people) {
      const reply = await createComment({
        server,
        token: person.auth.session.token,
        postId: post.id,
        parentId: thread.id,
      })

      existingReplies.push({ person, reply })
    }

    const operations: Operation[] = []

    for (const person of people) {
      const auth = bearer(person.auth.session.token)
      const postReactions = `/api/v1/posts/${post.id}/reactions`
      const commentReactions = `/api/v1/comments/${thread.id}/reactions`

      operations.push(
        () => request(server).put(`${postReactions}/changed_my_mind`).set(auth),
        () => request(server).put(`${postReactions}/needs_source`).set(auth),
        () => request(server).put(`${postReactions}/good_argument`).set(auth),
        () => request(server).put(`${postReactions}/good_argument`).set(auth),
        () => request(server).delete(`${postReactions}/good_argument`).set(auth),
        () => request(server).put(`${commentReactions}/insightful`).set(auth),
        () => request(server).delete(`${commentReactions}/insightful`).set(auth),
        () =>
          request(server)
            .post(`/api/v1/posts/${post.id}/comments`)
            .set(auth)
            .send({ body: "Nova resposta", parentId: thread.id }),
      )

      for (const other of people) {
        if (other === person) continue

        const followPath = `/api/v1/users/${other.auth.user.handle}/follow`

        operations.push(
          () => request(server).put(followPath).set(auth),
          () => request(server).put(followPath).set(auth),
          () => request(server).delete(followPath).set(auth),
        )
      }
    }

    for (const { person, reply } of existingReplies.slice(0, PARTICIPANTS / 2)) {
      operations.push(() =>
        request(server)
          .delete(`/api/v1/comments/${reply.id}`)
          .set(bearer(person.auth.session.token)),
      )
    }

    const responses = await runConcurrently({
      operations: shuffle(operations),
      limit: MAX_IN_FLIGHT,
    })

    // 409 is the reaction limit doing its job when a third kind arrives first.
    const unexpected = responses.filter((response) => ![201, 204, 409].includes(response.status))

    const mismatches = await findMismatches({
      postId: post.id,
      commentId: thread.id,
      userIds: people.map(({ auth }) => auth.user.id),
    })

    const overLimit = await findOverLimitReactions(post.id)

    expect(operations.length).toBeGreaterThan(100)

    expect(unexpected.map((response) => response.status)).toEqual([])

    expect(mismatches).toEqual([])

    expect(overLimit).toEqual([])
  })
})
