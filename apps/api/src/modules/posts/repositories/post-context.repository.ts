import { Inject, Injectable } from "@nestjs/common"
import {
  bookmarks,
  contextNotes,
  follows,
  reactions,
  type ContextNoteRow,
  type Database,
  type ReactionKindValue,
} from "@ponto/database"
import { and, eq, inArray, isNull } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface ViewerPostsParams {
  viewerId: string
  postIds: readonly string[]
}

export interface ViewerFollowersParams {
  viewerId: string
  authorIds: readonly string[]
}

export interface ViewerReactionRow {
  postId: string | null
  kind: ReactionKindValue
}

// Read model for what a post view shows besides the post itself: the active context note
// (owned by moderation) and the viewer's own state (reactions, bookmark, whether the author
// follows them). Reads only, in batch, so lists stay at a fixed number of queries.
@Injectable()
export class PostContextRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  listActiveContextNotes(postIds: readonly string[]): Promise<ContextNoteRow[]> {
    if (postIds.length === 0) return Promise.resolve([])

    return this.db
      .select()
      .from(contextNotes)
      .where(and(inArray(contextNotes.postId, [...postIds]), isNull(contextNotes.removedAt)))
  }

  listViewerReactions({ viewerId, postIds }: ViewerPostsParams): Promise<ViewerReactionRow[]> {
    if (postIds.length === 0) return Promise.resolve([])

    return this.db
      .select({ postId: reactions.postId, kind: reactions.kind })
      .from(reactions)
      .where(and(eq(reactions.userId, viewerId), inArray(reactions.postId, [...postIds])))
  }

  async listViewerBookmarks({ viewerId, postIds }: ViewerPostsParams): Promise<Set<string>> {
    if (postIds.length === 0) return new Set()

    const rows = await this.db
      .select({ postId: bookmarks.postId })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, viewerId), inArray(bookmarks.postId, [...postIds])))

    return new Set(rows.map(({ postId }) => postId))
  }

  // Authors among authorIds who follow the viewer.
  async listAuthorsFollowingViewer({
    viewerId,
    authorIds,
  }: ViewerFollowersParams): Promise<Set<string>> {
    if (authorIds.length === 0) return new Set()

    const rows = await this.db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(and(eq(follows.followeeId, viewerId), inArray(follows.followerId, [...authorIds])))

    return new Set(rows.map(({ followerId }) => followerId))
  }
}
