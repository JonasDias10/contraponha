import { Inject, Injectable } from "@nestjs/common"
import {
  commentRevisions,
  comments,
  consents,
  follows,
  notificationPreferences,
  postRevisions,
  posts,
  reactions,
  reports,
  sessions,
  topicFollows,
  topics,
  users,
  type Database,
} from "@contraponha/database"
import { and, asc, eq, inArray, isNull } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

// Read model for data exports (LGPD art. 18): gathers what every module stores about one
// person. Reads only; it never changes data owned by other modules.
@Injectable()
export class AccountDataRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async account(userId: string): Promise<Record<string, unknown>> {
    const [user] = await this.db
      .select({
        email: users.email,
        handle: users.handle,
        displayName: users.displayName,
        bio: users.bio,
        headline: users.headline,
        location: users.location,
        website: users.website,
        pronouns: users.pronouns,
        avatarUrl: users.avatarUrl,
        birthDate: users.birthDate,
        locale: users.locale,
        timezone: users.timezone,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))

    const accepted = await this.db
      .select({
        document: consents.document,
        version: consents.version,
        acceptedAt: consents.acceptedAt,
      })
      .from(consents)
      .where(eq(consents.userId, userId))
      .orderBy(asc(consents.acceptedAt))

    const accessHistory = await this.db
      .select({
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        lastUsedAt: sessions.lastUsedAt,
        revokedAt: sessions.revokedAt,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(asc(sessions.createdAt))

    const [preferences] = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))

    return {
      profile: user ?? null,
      consents: accepted,
      accessHistory,
      notificationPreferences: preferences ?? null,
    }
  }

  async content(userId: string): Promise<Record<string, unknown>> {
    const authoredPosts = await this.db
      .select({
        id: posts.id,
        title: posts.title,
        body: posts.body,
        sources: posts.sources,
        createdAt: posts.createdAt,
        editedAt: posts.editedAt,
      })
      .from(posts)
      .where(and(eq(posts.authorId, userId), isNull(posts.deletedAt)))
      .orderBy(asc(posts.id))

    const postIds = authoredPosts.map(({ id }) => id)

    const postVersions =
      postIds.length === 0
        ? []
        : await this.db
            .select({
              postId: postRevisions.postId,
              title: postRevisions.title,
              body: postRevisions.body,
              reason: postRevisions.reason,
              createdAt: postRevisions.createdAt,
            })
            .from(postRevisions)
            .where(inArray(postRevisions.postId, postIds))

    const authoredComments = await this.db
      .select({
        id: comments.id,
        postId: comments.postId,
        body: comments.body,
        sources: comments.sources,
        createdAt: comments.createdAt,
        editedAt: comments.editedAt,
      })
      .from(comments)
      .where(and(eq(comments.authorId, userId), isNull(comments.deletedAt)))
      .orderBy(asc(comments.id))

    const commentIds = authoredComments.map(({ id }) => id)

    const commentVersions =
      commentIds.length === 0
        ? []
        : await this.db
            .select({
              commentId: commentRevisions.commentId,
              body: commentRevisions.body,
              reason: commentRevisions.reason,
              createdAt: commentRevisions.createdAt,
            })
            .from(commentRevisions)
            .where(inArray(commentRevisions.commentId, commentIds))

    return {
      posts: authoredPosts.map((post) => ({
        ...post,
        previousVersions: postVersions.filter(({ postId }) => postId === post.id),
      })),
      contributions: authoredComments.map((comment) => ({
        ...comment,
        previousVersions: commentVersions.filter(({ commentId }) => commentId === comment.id),
      })),
    }
  }

  async reactions(userId: string): Promise<Record<string, unknown>> {
    const given = await this.db
      .select({
        kind: reactions.kind,
        postId: reactions.postId,
        commentId: reactions.commentId,
        createdAt: reactions.createdAt,
      })
      .from(reactions)
      .where(eq(reactions.userId, userId))
      .orderBy(asc(reactions.createdAt))

    return { given }
  }

  async connections(userId: string): Promise<Record<string, unknown>> {
    const following = await this.db
      .select({ handle: users.handle, since: follows.createdAt })
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followeeId))
      .where(eq(follows.followerId, userId))

    const followers = await this.db
      .select({ handle: users.handle, since: follows.createdAt })
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followerId))
      .where(eq(follows.followeeId, userId))

    return { following, followers }
  }

  async recommendations(userId: string): Promise<Record<string, unknown>> {
    const followedTopics = await this.db
      .select({ topic: topics.name, since: topicFollows.createdAt })
      .from(topicFollows)
      .innerJoin(topics, eq(topics.id, topicFollows.topicId))
      .where(eq(topicFollows.userId, userId))

    return { followedTopics }
  }

  async reports(userId: string): Promise<Record<string, unknown>> {
    const sent = await this.db
      .select({
        targetType: reports.targetType,
        reason: reports.reason,
        details: reports.details,
        status: reports.status,
        createdAt: reports.createdAt,
        resolvedAt: reports.resolvedAt,
      })
      .from(reports)
      .where(eq(reports.reporterId, userId))

    return { sent }
  }
}
