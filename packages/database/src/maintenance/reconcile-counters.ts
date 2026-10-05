import { asc, gt, sql, type SQL } from "drizzle-orm"
import type { PgColumn, PgTable } from "drizzle-orm/pg-core"

import type { Database, DatabaseTransaction } from "../client.js"
import { comments } from "../schema/comments.js"
import { posts } from "../schema/posts.js"
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

async function fixUserFollowCounts({ tx, ids }: FixBatchParams): Promise<number> {
  const result = await tx.execute(sql`
    update users as u
    set follower_count = c.followers, following_count = c.following
    from (
      select
        target.id,
        (select count(*) from follows f where f.followee_id = target.id)::int as followers,
        (select count(*) from follows f where f.follower_id = target.id)::int as following
      from unnest(${idArray(ids)}) as target(id)
    ) as c
    where u.id = c.id
      and (u.follower_count <> c.followers or u.following_count <> c.following)
  `)

  return result.rowCount ?? 0
}

async function fixPostCounts({ tx, ids }: FixBatchParams): Promise<number> {
  const result = await tx.execute(sql`
    update posts as p
    set
      comment_count = c.comments,
      good_argument_count = c.good_argument,
      insightful_count = c.insightful,
      agree_count = c.agree,
      disagree_count = c.disagree
    from (
      select
        target.id,
        (select count(*) from comments cm where cm.post_id = target.id and cm.deleted_at is null)::int as comments,
        count(r.id) filter (where r.kind = 'good_argument')::int as good_argument,
        count(r.id) filter (where r.kind = 'insightful')::int as insightful,
        count(r.id) filter (where r.kind = 'agree')::int as agree,
        count(r.id) filter (where r.kind = 'disagree')::int as disagree
      from unnest(${idArray(ids)}) as target(id)
      left join reactions r on r.post_id = target.id
      group by target.id
    ) as c
    where p.id = c.id
      and (
        p.comment_count <> c.comments
        or p.good_argument_count <> c.good_argument
        or p.insightful_count <> c.insightful
        or p.agree_count <> c.agree
        or p.disagree_count <> c.disagree
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
      agree_count = c.agree,
      disagree_count = c.disagree
    from (
      select
        target.id,
        (select count(*) from comments reply where reply.parent_id = target.id and reply.deleted_at is null)::int as replies,
        count(r.id) filter (where r.kind = 'good_argument')::int as good_argument,
        count(r.id) filter (where r.kind = 'insightful')::int as insightful,
        count(r.id) filter (where r.kind = 'agree')::int as agree,
        count(r.id) filter (where r.kind = 'disagree')::int as disagree
      from unnest(${idArray(ids)}) as target(id)
      left join reactions r on r.comment_id = target.id
      group by target.id
    ) as c
    where cm.id = c.id
      and (
        cm.reply_count <> c.replies
        or cm.good_argument_count <> c.good_argument
        or cm.insightful_count <> c.insightful
        or cm.agree_count <> c.agree
        or cm.disagree_count <> c.disagree
      )
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
    fixBatch: fixUserFollowCounts,
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

  return { users: fixedUsers, posts: fixedPosts, comments: fixedComments }
}
