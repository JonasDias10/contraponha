import { Inject, Injectable } from "@nestjs/common"
import { mediaAssets, type Database, type DatabaseExecutor } from "@ponto/database"
import { and, asc, eq, inArray } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { MediaAsset } from "#src/modules/media/domain/media.js"

export interface CreateMediaAssetData {
  ownerId: string
  storageKey: string
  mimeType: string
  sizeBytes: number
}

export interface AttachMediaParams {
  mediaIds: readonly string[]
  postId: string
  executor?: DatabaseExecutor
}

export interface DeleteMediaForPostParams {
  postId: string
  executor?: DatabaseExecutor
}

export interface DeleteMediaForOwnerParams {
  ownerId: string
  executor: DatabaseExecutor
}

@Injectable()
export class MediaRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(data: CreateMediaAssetData): Promise<MediaAsset> {
    const [asset] = await this.db.insert(mediaAssets).values(data).returning()

    if (!asset) throw new Error("Insert into media_assets returned no row")

    return asset
  }

  findByIds(ids: readonly string[]): Promise<MediaAsset[]> {
    if (ids.length === 0) return Promise.resolve([])

    return this.db
      .select()
      .from(mediaAssets)
      .where(inArray(mediaAssets.id, [...ids]))
  }

  async attach({ mediaIds, postId, executor = this.db }: AttachMediaParams): Promise<void> {
    for (const [position, id] of mediaIds.entries()) {
      await executor
        .update(mediaAssets)
        .set({ postId, position, status: "attached", attachedAt: new Date() })
        .where(and(eq(mediaAssets.id, id), eq(mediaAssets.status, "pending")))
    }
  }

  listByPosts(postIds: readonly string[]): Promise<MediaAsset[]> {
    if (postIds.length === 0) return Promise.resolve([])

    return this.db
      .select()
      .from(mediaAssets)
      .where(inArray(mediaAssets.postId, [...postIds]))
      .orderBy(asc(mediaAssets.postId), asc(mediaAssets.position))
  }

  async deleteForPost({ postId, executor = this.db }: DeleteMediaForPostParams): Promise<string[]> {
    const deleted = await executor
      .delete(mediaAssets)
      .where(eq(mediaAssets.postId, postId))
      .returning({ storageKey: mediaAssets.storageKey })

    return deleted.map(({ storageKey }) => storageKey)
  }

  async deleteForOwner({ ownerId, executor }: DeleteMediaForOwnerParams): Promise<string[]> {
    const removed = await executor
      .delete(mediaAssets)
      .where(eq(mediaAssets.ownerId, ownerId))
      .returning({ storageKey: mediaAssets.storageKey })

    return removed.map(({ storageKey }) => storageKey)
  }
}
