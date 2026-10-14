import { asc, gt, sql, type SQL } from "drizzle-orm"
import type { PgColumn, PgTable } from "drizzle-orm/pg-core"

import type { Database, DatabaseTransaction } from "../client.js"
import { comments } from "../schema/comments.js"
import { posts } from "../schema/posts.js"
import { topics } from "../schema/topics.js"
import { users } from "../schema/users.js"
import { runTransaction } from "../transaction.js"

export const COUNTER_RECONCILE_BATCH_SIZE = 500

export interface ReconcileCountersParams {
  db: Database
  batchSize?: number
}

export interface CounterReconcileReport {
  users: number
  posts: number
  comments: number
  topics: number
}

interface FixBatchParams {
  tx: DatabaseTransaction
  ids: string[]
}

interface ReconcileTableParams {
  db: Database
  batchSize: number
  table: PgTable
  idColumn: PgColumn
  fixBatch: (params: FixBatchParams) => Promise<number>
}

interface ReconcileBatchParams extends ReconcileTableParams {
  afterId: string | undefined
}

interface BatchResult {
  lastId: string | undefined
  fixed: number
}

// Passed as a single array literal: drizzle would otherwise expand a JS array into a list of params.
function idArray(ids: string[]): SQL {
  return sql`${`{${ids.join(",")}}`}::uuid[]`
}

async function fixUserCounts({ tx, ids }: FixBatchParams): Promise<number> {
  const result = await tx.execute(sql`
    update users as u
    set follower_count = c.followers, following_count = c.following, post_count = c.posts
    from (
      select
        target.id,
        (select count(*) from follows f where f.followee_id = target.id)::int as followers,
        (select count(*) from follows f where f.follower_id = target.id)::int as following,
        (select count(*) from posts p where p.author_id = target.id and p.deleted_at is null)::int as posts
      from unnest(${idArray(ids)}) as target(id)
    ) as c
    where u.id = c.id
      and (
        u.follower_count <> c.followers
        or u.following_count <> c.following
        or u.post_count <> c.posts
      )
  `)

  return result.rowCount ?? 0
}

async function fixPostCounts({ tx, ids }: FixBatchParams): Promise<number> {
  const result = await tx.execute(sql`
    update posts as p
    set
      comment_count = c.comments,
      highlighted_comment_count = c.highlighted,
      good_argument_count = c.good_argument,
      insightful_count = c.insightful,
      changed_my_mind_count = c.changed_my_mind,
      needs_source_count = c.needs_source,
      repost_count = c.reposts,
      quote_count = c.quotes
    from (
      select
        target.id,
        (select count(*) from comments cm where cm.post_id = target.id and cm.deleted_at is null)::int as comments,
        (select count(*) from comments cm where cm.post_id = target.id and cm.deleted_at is null and cm.highlighted_at is not null)::int as highlighted,
        count(r.id) filter (where r.kind = 'good_argument')::int as good_argument,
        count(r.id) filter (where r.kind = 'insightful')::int as insightful,
        count(r.id) filter (where r.kind = 'changed_my_mind')::int as changed_my_mind,
        count(r.id) filter (where r.kind = 'needs_source')::int as needs_source,
        (select count(*) from reposts rp where rp.post_id = target.id)::int as reposts,
        (select count(*) from posts q where q.quoted_post_id = target.id and q.deleted_at is null)::int as quotes
      from unnest(${idArray(ids)}) as target(id)
      left join reactions r on r.post_id = target.id
      group by target.id
    ) as c
    where p.id = c.id
      and (
        p.comment_count <> c.comments
        or p.good_argument_count <> c.good_argument
        or p.insightful_count <> c.insightful
        or p.changed_my_mind_count <> c.changed_my_mind
        or p.needs_source_count <> c.needs_source
        or p.highlighted_comment_count <> c.highlighted
        or p.repost_count <> c.reposts
        or p.quote_count <> c.quotes
      )
  `)

  return result.rowCount ?? 0
}

async function fixCommentCounts({ tx, ids }: FixBatchParams): Promise<number> {
  const result = await tx.execute(sql`
    update comments as cm
    set
      reply_count = c.replies,
      good_argument_count = c.good_argument,
      insightful_count = c.insightful,
      changed_my_mind_count = c.changed_my_mind,
      needs_source_count = c.needs_source
    from (
      select
        target.id,
        (select count(*) from comments reply where reply.parent_id = target.id and reply.deleted_at is null)::int as replies,
        count(r.id) filter (where r.kind = 'good_argument')::int as good_argument,
        count(r.id) filter (where r.kind = 'insightful')::int as insightful,
        count(r.id) filter (where r.kind = 'changed_my_mind')::int as changed_my_mind,
        count(r.id) filter (where r.kind = 'needs_source')::int as needs_source
      from unnest(${idArray(ids)}) as target(id)
      left join reactions r on r.comment_id = target.id
      group by target.id
    ) as c
    where cm.id = c.id
      and (
        cm.reply_count <> c.replies
        or cm.good_argument_count <> c.good_argument
        or cm.insightful_count <> c.insightful
        or cm.changed_my_mind_count <> c.changed_my_mind
        or cm.needs_source_count <> c.needs_source
      )
  `)

  return result.rowCount ?? 0
}

async function fixTopicCounts({ tx, ids }: FixBatchParams): Promise<number> {
  const result = await tx.execute(sql`
    update topics as t
    set post_count = c.posts, follower_count = c.followers
    from (
      select
        target.id,
        (select count(*) from post_topics pt join posts p on p.id = pt.post_id
          where pt.topic_id = target.id and p.deleted_at is null)::int as posts,
        (select count(*) from topic_follows tf where tf.topic_id = target.id)::int as followers
      from unnest(${idArray(ids)}) as target(id)
    ) as c
    where t.id = c.id
      and (t.post_count <> c.posts or t.follower_count <> c.followers)
  `)

  return result.rowCount ?? 0
}

// Each batch locks its rows (in id order, the same order the API uses) before counting.
// A concurrent write either committed before the lock, and is counted, or is still waiting
// for the lock and applies its own increment afterwards; neither is lost or double-counted.
async function reconcileBatch({
  db,
  batchSize,
  table,
  idColumn,
  fixBatch,
  afterId,
}: ReconcileBatchParams): Promise<BatchResult> {
  return runTransaction({
    db,
    work: async (tx) => {
      const locked = await tx
        .select({ id: idColumn })
        .from(table)
        .where(afterId ? gt(idColumn, afterId) : undefined)
        .orderBy(asc(idColumn))
        .limit(batchSize)
        .for("update")

      const ids = locked.map(({ id }) => String(id))

      if (ids.length === 0) return { lastId: undefined, fixed: 0 }

      const fixed = await fixBatch({ tx, ids })
      return { lastId: ids.at(-1), fixed }
    },
  })
}

async function reconcileTable(params: ReconcileTableParams): Promise<number> {
  let afterId: string | undefined
  let fixed = 0

  do {
    const batch = await reconcileBatch({ ...params, afterId })

    fixed += batch.fixed

    afterId = batch.lastId
  } while (afterId)

  return fixed
}

export async function reconcileCounters({
  db,
  batchSize = COUNTER_RECONCILE_BATCH_SIZE,
}: ReconcileCountersParams): Promise<CounterReconcileReport> {
  const fixedUsers = await reconcileTable({
    db,
    batchSize,
    table: users,
    idColumn: users.id,
    fixBatch: fixUserCounts,
  })

  const fixedPosts = await reconcileTable({
    db,
    batchSize,
    table: posts,
    idColumn: posts.id,
    fixBatch: fixPostCounts,
  })

  const fixedComments = await reconcileTable({
    db,
    batchSize,
    table: comments,
    idColumn: comments.id,
    fixBatch: fixCommentCounts,
  })

  const fixedTopics = await reconcileTable({
    db,
    batchSize,
    table: topics,
    idColumn: topics.id,
    fixBatch: fixTopicCounts,
  })

  return { users: fixedUsers, posts: fixedPosts, comments: fixedComments, topics: fixedTopics }
}
