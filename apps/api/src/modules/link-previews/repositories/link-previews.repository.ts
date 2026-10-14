import { Inject, Injectable } from "@nestjs/common"
import { linkPreviews, type Database, type LinkPreviewRow } from "@contraponha/database"
import { inArray } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export type LinkPreviewData = Omit<LinkPreviewRow, "fetchedAt">

@Injectable()
export class LinkPreviewsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  findByUrls(urls: readonly string[]): Promise<LinkPreviewRow[]> {
    if (urls.length === 0) return Promise.resolve([])

    return this.db
      .select()
      .from(linkPreviews)
      .where(inArray(linkPreviews.url, [...urls]))
  }

  async save(data: LinkPreviewData): Promise<void> {
    const fetchedAt = new Date()

    await this.db
      .insert(linkPreviews)
      .values({ ...data, fetchedAt })
      .onConflictDoUpdate({ target: linkPreviews.url, set: { ...data, fetchedAt } })
  }
}
