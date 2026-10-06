import { Injectable } from "@nestjs/common"
import { consents, type DatabaseExecutor, type LegalDocumentValue } from "@ponto/database"

export interface ConsentData {
  document: LegalDocumentValue
  version: string
}

export interface RecordConsentsParams {
  userId: string
  accepted: readonly ConsentData[]
  executor: DatabaseExecutor
}

@Injectable()
export class ConsentsRepository {
  async record({ userId, accepted, executor }: RecordConsentsParams): Promise<void> {
    if (accepted.length === 0) return

    await executor.insert(consents).values(accepted.map((consent) => ({ userId, ...consent })))
  }
}
