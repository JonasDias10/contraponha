import type { NestExpressApplication } from "@nestjs/platform-express"
import {
  commentPageSchema,
  contributionPageSchema,
  followedByPreviewSchema,
  profileViewSchema,
  suggestedPeopleSchema,
} from "@ponto/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App, type RegisteredAccount } from "./support/accounts.js"
import { createComment, createPost } from "./support/content.js"
import { createTestApp } from "./support/create-test-app.js"

interface PeopleParams {
  server: App
  count: number
}

interface FollowParams {
  server: App
  follower: RegisteredAccount
  followee: RegisteredAccount
}

async function registerPeople({ server, count }: PeopleParams): Promise<RegisteredAccount[]> {
  const people: RegisteredAccount[] = []

  for (let index = 0; index < count; index += 1) {
    const person = await registerAccount({ server })

    people.push(person)
  }

  return people
}

async function follow({ server, follower, followee }: FollowParams): Promise<void> {
  await request(server)
    .put(`/api/v1/users/${followee.auth.user.handle}/follow`)
    .set(bearer(follower.auth.session.token))
    .expect(204)
}

describe("discussions and people", () => {
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

  it("lists highlighted and well-received contributions first", async () => {
    const [author, plain, praised, highlighted, reader] = await registerPeople({ server, count: 5 })

    if (!author || !plain || !praised || !highlighted || !reader) throw new Error("Missing people")

    const post = await createPost({ server, token: author.auth.session.token })

    const plainComment = await createComment({
      server,
      token: plain.auth.session.token,
      postId: post.id,
    })

    const praisedComment = await createComment({
      server,
      token: praised.auth.session.token,
      postId: post.id,
    })

    const highlightedComment = await createComment({
      server,
      token: highlighted.auth.session.token,
      postId: post.id,
    })

    await request(server)
      .put(`/api/v1/comments/${praisedComment.id}/reactions/good_argument`)
      .set(bearer(reader.auth.session.token))
      .expect(204)

    await request(server)
      .put(`/api/v1/comments/${highlightedComment.id}/highlight`)
      .set(bearer(plain.auth.session.token))
      .send({})
      .expect(403)

    await request(server)
      .put(`/api/v1/comments/${highlightedComment.id}/highlight`)
      .set(bearer(author.auth.session.token))
      .send({ note: "Trouxe dado de campo" })
      .expect(200)

    const relevant = await request(server)
      .get(`/api/v1/posts/${post.id}/comments`)
      .set(bearer(reader.auth.session.token))
      .expect(200)

    const recent = await request(server)
      .get(`/api/v1/posts/${post.id}/comments`)
      .query({ sort: "recent" })
      .expect(200)

    const relevantPage = commentPageSchema.parse(relevant.body)

    expect(relevantPage.items.map(({ id }) => id)).toEqual([
      highlightedComment.id,
      praisedComment.id,
      plainComment.id,
    ])

    expect(relevantPage.items[0]?.highlight?.note).toBe("Trouxe dado de campo")

    expect(relevantPage.items[1]?.viewer?.reactions).toEqual(["good_argument"])

    expect(commentPageSchema.parse(recent.body).items.map(({ id }) => id)).toEqual([
      highlightedComment.id,
      praisedComment.id,
      plainComment.id,
    ])

    const highlightedTab = await request(server)
      .get(`/api/v1/users/${highlighted.auth.user.handle}/highlighted-contributions`)
      .expect(200)

    const [contribution] = contributionPageSchema.parse(highlightedTab.body).items

    expect(contribution?.post.id).toBe(post.id)
  })

  it("lets authors limit contributions to people they follow", async () => {
    const [author, followed, stranger] = await registerPeople({ server, count: 3 })

    if (!author || !followed || !stranger) throw new Error("Missing people")

    await follow({ server, follower: author, followee: followed })

    const response = await request(server)
      .post("/api/v1/posts")
      .set(bearer(author.auth.session.token))
      .send({ body: "Só quem eu sigo", replyPolicy: "following" })
      .expect(201)

    const postId: string = response.body.id

    await createComment({ server, token: followed.auth.session.token, postId })

    const refused = await request(server)
      .post(`/api/v1/posts/${postId}/comments`)
      .set(bearer(stranger.auth.session.token))
      .send({ body: "Posso?" })
      .expect(403)

    const asStranger = await request(server)
      .get(`/api/v1/posts/${postId}`)
      .set(bearer(stranger.auth.session.token))
      .expect(200)

    expect(refused.body.error.code).toBe("REPLIES_RESTRICTED")

    expect(asStranger.body.viewer.canReply).toBe(false)
  })

  it("shows recognition, topics written about and the viewer's relationship", async () => {
    const people = await registerPeople({ server, count: 12 })
    const [writer, viewer, mutual, ...readers] = people

    if (!writer || !viewer || !mutual) throw new Error("Missing people")

    const response = await request(server)
      .post("/api/v1/posts")
      .set(bearer(writer.auth.session.token))
      .send({ body: "Calçadas do Recife", topics: ["Cidades"] })
      .expect(201)

    const postId: string = response.body.id

    for (const reader of [mutual, ...readers]) {
      await request(server)
        .put(`/api/v1/posts/${postId}/reactions/good_argument`)
        .set(bearer(reader.auth.session.token))
        .expect(204)
    }

    await follow({ server, follower: viewer, followee: mutual })

    await follow({ server, follower: mutual, followee: writer })

    await follow({ server, follower: writer, followee: viewer })

    const profile = await request(server)
      .get(`/api/v1/users/${writer.auth.user.handle}`)
      .set(bearer(viewer.auth.session.token))
      .expect(200)

    const followedBy = await request(server)
      .get(`/api/v1/users/${writer.auth.user.handle}/followed-by`)
      .set(bearer(viewer.auth.session.token))
      .expect(200)

    expect(profileViewSchema.parse(profile.body)).toMatchObject({
      postCount: 1,
      recognition: {
        kind: "good_argument",
        topics: [{ slug: "cidades", name: "Cidades", isCurated: true }],
      },
      topics: [{ slug: "cidades" }],
      viewer: { isFollowing: false, isFollowedBy: true },
    })

    expect(followedByPreviewSchema.parse(followedBy.body)).toMatchObject({
      people: [{ handle: mutual.auth.user.handle }],
      total: 1,
    })
  })

  it("suggests people who write well about the reader's topics", async () => {
    const [writer, reader, reactor] = await registerPeople({ server, count: 3 })

    if (!writer || !reader || !reactor) throw new Error("Missing people")

    await request(server)
      .put("/api/v1/topics/followed")
      .set(bearer(reader.auth.session.token))
      .send({ slugs: ["literatura"] })
      .expect(200)

    const response = await request(server)
      .post("/api/v1/posts")
      .set(bearer(writer.auth.session.token))
      .send({ body: "Machado de Assis e a ironia", topics: ["Literatura"] })
      .expect(201)

    await request(server)
      .put(`/api/v1/posts/${response.body.id}/reactions/insightful`)
      .set(bearer(reactor.auth.session.token))
      .expect(204)

    const suggestions = await request(server)
      .get("/api/v1/people/suggestions")
      .set(bearer(reader.auth.session.token))
      .expect(200)

    const handles = suggestedPeopleSchema
      .parse(suggestions.body)
      .people.map(({ profile }) => profile.handle)

    expect(handles).toContain(writer.auth.user.handle)

    await follow({ server, follower: reader, followee: writer })

    const afterFollowing = await request(server)
      .get("/api/v1/people/suggestions")
      .set(bearer(reader.auth.session.token))
      .expect(200)

    expect(
      suggestedPeopleSchema.parse(afterFollowing.body).people.map(({ profile }) => profile.handle),
    ).not.toContain(writer.auth.user.handle)
  })
})
