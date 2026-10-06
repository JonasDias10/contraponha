import { Inject, Injectable } from "@nestjs/common"
import { dataExports, type Database, type DatabaseExecutor } from "@ponto/database"
import type { DataExportFormat, DataExportSection } from "@ponto/types"
import { and, asc, desc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { DataExport } from "#src/modules/accounts/domain/data-export.js"

export const DATA_EXPORTS_LISTED_MAX = 10

export interface CreateDataExportData {
  userId: string
  format: DataExportFormat
  sections: DataExportSection[]
}

export interface UserExportParams {
  userId: string
  id: string
}

export interface MarkReadyParams {
  id: string
  storageKey: string
  expiresAt: Date
}

export interface DeleteForUserParams {
  userId: string
  executor: DatabaseExecutor
}

@Injectable()
export class DataExportsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(data: CreateDataExportData): Promise<DataExport> {
    const [row] = await this.db.insert(dataExports).values(data).returning()

    if (!row) throw new Error("Insert into data_exports returned no row")

    return row
  }

  async hasActive(userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: dataExports.id })
      .from(dataExports)
      .where(
        and(eq(dataExports.userId, userId), inArray(dataExports.status, ["pending", "processing"])),
      )
      .limit(1)

    return row !== undefined
  }

  listByUser(userId: string): Promise<DataExport[]> {
    return this.db
      .select()
      .from(dataExports)
      .where(eq(dataExports.userId, userId))
      .orderBy(desc(dataExports.id))
      .limit(DATA_EXPORTS_LISTED_MAX)
  }

  async findForUser({ userId, id }: UserExportParams): Promise<DataExport | undefined> {
    const [row] = await this.db
      .select()
      .from(dataExports)
      .where(and(eq(dataExports.id, id), eq(dataExports.userId, userId)))

    return row
  }

  // Claims the oldest pending export; SKIP LOCKED lets several API instances share the work.
  async claimNextPending(): Promise<DataExport | undefined> {
    return this.db.transaction(async (tx) => {
      const [next] = await tx
        .select({ id: dataExports.id })
        .from(dataExports)
        .where(eq(dataExports.status, "pending"))
        .orderBy(asc(dataExports.createdAt))
        .limit(1)
        .for("update", { skipLocked: true })

      if (!next) return undefined

      const [claimed] = await tx
        .update(dataExports)
        .set({ status: "processing", startedAt: new Date() })
        .where(eq(dataExports.id, next.id))
        .returning()

      return claimed
    })
  }

  async markReady({ id, storageKey, expiresAt }: MarkReadyParams): Promise<void> {
    await this.db
      .update(dataExports)
      .set({ status: "ready", storageKey, completedAt: new Date(), expiresAt })
      .where(eq(dataExports.id, id))
  }

  async markFailed(id: string): Promise<void> {
    await this.db
      .update(dataExports)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(dataExports.id, id))
  }

  listExpiredWithFiles(now: Date): Promise<DataExport[]> {
    return this.db
      .select()
      .from(dataExports)
      .where(
        and(
          eq(dataExports.status, "ready"),
          isNotNull(dataExports.storageKey),
          lte(dataExports.expiresAt, now),
        ),
      )
      .limit(50)
  }

  async clearStorageKeys(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return

    await this.db
      .update(dataExports)
      .set({ storageKey: sql`null` })
      .where(inArray(dataExports.id, [...ids]))
  }

  async deleteForUser({ userId, executor }: DeleteForUserParams): Promise<string[]> {
    const removed = await executor
      .delete(dataExports)
      .where(eq(dataExports.userId, userId))
      .returning({ storageKey: dataExports.storageKey })

    return removed.flatMap(({ storageKey }) => (storageKey ? [storageKey] : []))
  }
}
