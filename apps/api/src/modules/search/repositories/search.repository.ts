import { Inject, Injectable } from "@nestjs/common"
import { comments, follows, posts, users, type Database, type UserRow } from "@contraponha/database"
import { SearchSort } from "@contraponha/types"
import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { Comment } from "#src/modules/comments/domain/comment.js"
import type { Post } from "#src/modules/posts/domain/post.js"
import {
  escapeLikePattern,
  HEADLINE_OPTIONS,
} from "#src/modules/search/domain/search-pagination.js"

export interface SearchParams {
  query: string
  offset: number
  limit: number
}

export interface ContentFilters {
  sort: SearchSort
  since: Date | null
  hasSource: boolean
  hasHighlights: boolean
  followedBy: string | undefined
}

export interface ContentSearchParams extends SearchParams {
  filters: ContentFilters
}

export interface PostSearchRow {
  post: Post
  highlight: string | null
}

export interface CommentSearchRow {
  comment: Comment
  highlight: string | null
}

function tsQueryFor(query: string): SQL {
  return sql`websearch_to_tsquery('portuguese', ${query})`
}

interface AuthoredByFollowedParams {
  authorColumn: typeof posts.authorId | typeof comments.authorId
  userId: string
}

function authoredByFollowed({ authorColumn, userId }: AuthoredByFollowedParams): SQL {
  return inArray(
    authorColumn,
    sql`(select ${follows.followeeId} from ${follows} where ${follows.followerId} = ${userId})`,
  )
}

// Read model: queries tables owned by users, posts, comments and follows for reads only.
@Injectable()
export class SearchRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  searchUsers({ query, offset, limit }: SearchParams): Promise<UserRow[]> {
    const pattern = escapeLikePattern(query)
    const similarity = sql`greatest(similarity(${users.handle}, ${query}), similarity(${users.displayName}, ${query}))`

    return this.db
      .select()
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          or(
            sql`${users.handle} % ${query}`,
            sql`${users.displayName} % ${query}`,
            ilike(users.handle, `${pattern}%`),
            ilike(users.displayName, `%${pattern}%`),
            ilike(users.headline, `%${pattern}%`),
          ),
        ),
      )
      .orderBy(desc(similarity), asc(users.id))
      .offset(offset)
      .limit(limit)
  }

  // "Relevant" weighs text match by the quality reactions the post received; popularity
  // and follower counts play no part.
  searchPosts({ query, offset, limit, filters }: ContentSearchParams): Promise<PostSearchRow[]> {
    const tsQuery = tsQueryFor(query)
    const quality = sql`ln(2 + 3 * ${posts.goodArgumentCount} + 3 * ${posts.changedMyMindCount} + 2 * ${posts.insightfulCount})`
    const document = sql`coalesce(${posts.title}, '') || ' — ' || coalesce(${posts.body}, '')`

    return this.db
      .select({
        post: posts,
        highlight: sql<
          string | null
        >`ts_headline('portuguese', ${document}, ${tsQuery}, ${HEADLINE_OPTIONS})`,
      })
      .from(posts)
      .where(
        and(
          isNull(posts.deletedAt),
          sql`${posts.searchVector} @@ ${tsQuery}`,
          filters.since ? gt(posts.createdAt, filters.since) : undefined,
          filters.hasSource ? sql`jsonb_array_length(${posts.sources}) > 0` : undefined,
          filters.hasHighlights ? gt(posts.highlightedCommentCount, 0) : undefined,
          filters.followedBy
            ? authoredByFollowed({ authorColumn: posts.authorId, userId: filters.followedBy })
            : undefined,
        ),
      )
      .orderBy(
        ...(filters.sort === SearchSort.RECENT
          ? [desc(posts.id)]
          : [desc(sql`ts_rank(${posts.searchVector}, ${tsQuery}) * ${quality}`), desc(posts.id)]),
      )
      .offset(offset)
      .limit(limit)
  }

  searchComments({
    query,
    offset,
    limit,
    filters,
  }: ContentSearchParams): Promise<CommentSearchRow[]> {
    const tsQuery = tsQueryFor(query)
    const quality = sql`ln(2 + 3 * ${comments.goodArgumentCount} + 3 * ${comments.changedMyMindCount} + 2 * ${comments.insightfulCount})`

    return this.db
      .select({
        comment: comments,
        highlight: sql<
          string | null
        >`ts_headline('portuguese', coalesce(${comments.body}, ''), ${tsQuery}, ${HEADLINE_OPTIONS})`,
      })
      .from(comments)
      .innerJoin(posts, eq(posts.id, comments.postId))
      .where(
        and(
          isNull(comments.deletedAt),
          isNull(posts.deletedAt),
          sql`${comments.searchVector} @@ ${tsQuery}`,
          filters.since ? gt(comments.createdAt, filters.since) : undefined,
          filters.hasSource ? sql`jsonb_array_length(${comments.sources}) > 0` : undefined,
          filters.hasHighlights ? isNotNull(comments.highlightedAt) : undefined,
          filters.followedBy
            ? authoredByFollowed({ authorColumn: comments.authorId, userId: filters.followedBy })
            : undefined,
        ),
      )
      .orderBy(
        ...(filters.sort === SearchSort.RECENT
          ? [desc(comments.id)]
          : [
              sql`${comments.highlightedAt} desc nulls last`,
              desc(sql`ts_rank(${comments.searchVector}, ${tsQuery}) * ${quality}`),
              desc(comments.id),
            ]),
      )
      .offset(offset)
      .limit(limit)
  }
}
