import { Inject, Injectable } from "@nestjs/common"
import { posts, users, type Database, type UserRow } from "@ponto/database"
import { and, asc, desc, ilike, isNull, or, sql } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { Post } from "#src/modules/posts/domain/post.js"
import { escapeLikePattern } from "#src/modules/search/domain/search-pagination.js"

export interface SearchParams {
  query: string
  offset: number
  limit: number
}

// Read model: queries tables owned by users and posts for reads only.
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
        or(
          sql`${users.handle} % ${query}`,
          sql`${users.displayName} % ${query}`,
          ilike(users.handle, `${pattern}%`),
          ilike(users.displayName, `%${pattern}%`),
        ),
      )
      .orderBy(desc(similarity), asc(users.id))
      .offset(offset)
      .limit(limit)
  }

  searchPosts({ query, offset, limit }: SearchParams): Promise<Post[]> {
    const tsQuery = sql`websearch_to_tsquery('portuguese', ${query})`

    return this.db
      .select()
      .from(posts)
      .where(and(isNull(posts.deletedAt), sql`${posts.searchVector} @@ ${tsQuery}`))
      .orderBy(desc(sql`ts_rank(${posts.searchVector}, ${tsQuery})`), desc(posts.id))
      .offset(offset)
      .limit(limit)
  }
}
