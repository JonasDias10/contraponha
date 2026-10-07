import { Injectable } from "@nestjs/common"
import {
  contextNotes,
  type ContentSourceValue,
  type ContextNoteRow,
  type DatabaseExecutor,
} from "@contraponha/database"
import { and, eq, isNull } from "drizzle-orm"

export interface ContextNoteData {
  postId: string
  authorId: string
  body: string
  sources: ContentSourceValue[]
}

export interface ReplaceContextNoteParams {
  data: ContextNoteData
  executor: DatabaseExecutor
}

export interface RetireContextNoteParams {
  postId: string
  executor: DatabaseExecutor
}

@Injectable()
export class ContextNotesRepository {
  // The previous note is retired, not deleted, so its history stays available.
  async replace({ data, executor }: ReplaceContextNoteParams): Promise<ContextNoteRow> {
    await this.retire({ postId: data.postId, executor })

    const [note] = await executor.insert(contextNotes).values(data).returning()

    if (!note) throw new Error("Insert into context_notes returned no row")

    return note
  }

  async retire({ postId, executor }: RetireContextNoteParams): Promise<boolean> {
    const retired = await executor
      .update(contextNotes)
      .set({ removedAt: new Date() })
      .where(and(eq(contextNotes.postId, postId), isNull(contextNotes.removedAt)))
      .returning({ id: contextNotes.id })

    return retired.length > 0
  }
}
