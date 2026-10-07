import { Injectable, Logger } from "@nestjs/common"
import { daysToMs, minutesToMs, msToSeconds } from "@contraponha/config"
import {
  ApiErrorCode,
  DataExportStatus,
  type DataExportDownload,
  type DataExportFormat,
  type DataExportList,
  type DataExportSection,
  type DataExportView,
} from "@contraponha/types"

import { AppError } from "#src/common/errors/app-error.js"
import {
  DATA_EXPORT_DOWNLOAD_URL_TTL_MINUTES,
  DATA_EXPORT_RETENTION_DAYS,
} from "#src/config/durations.js"
import { ObjectStorage } from "#src/infrastructure/storage/object-storage.js"
import {
  dataExportStatus,
  EXPORT_CONTENT_TYPES,
  renderHtmlExport,
  renderJsonExport,
  toDataExportView,
  type DataExport,
  type ExportDocument,
} from "#src/modules/accounts/domain/data-export.js"
import { AccountDataRepository } from "#src/modules/accounts/repositories/account-data.repository.js"
import { DataExportsRepository } from "#src/modules/accounts/repositories/data-exports.repository.js"
import { AccountVerificationService } from "#src/modules/auth/services/account-verification.service.js"

export interface RequestDataExportParams {
  userId: string
  format: DataExportFormat
  sections: DataExportSection[]
}

export interface DownloadDataExportParams {
  userId: string
  exportId: string
}

interface LoadSectionParams {
  section: DataExportSection
  userId: string
}

@Injectable()
export class DataExportsService {
  private readonly logger = new Logger(DataExportsService.name)

  constructor(
    private readonly exportsRepository: DataExportsRepository,
    private readonly accountData: AccountDataRepository,
    private readonly storage: ObjectStorage,
    private readonly accountVerification: AccountVerificationService,
  ) {}

  async request({ userId, format, sections }: RequestDataExportParams): Promise<DataExportView> {
    const hasActive = await this.exportsRepository.hasActive(userId)

    if (hasActive) throw new AppError(ApiErrorCode.DATA_EXPORT_IN_PROGRESS)

    const created = await this.exportsRepository.create({ userId, format, sections })
    return toDataExportView({ dataExport: created, now: new Date() })
  }

  async list(userId: string): Promise<DataExportList> {
    const rows = await this.exportsRepository.listByUser(userId)
    const now = new Date()

    return { exports: rows.map((dataExport) => toDataExportView({ dataExport, now })) }
  }

  async download({ userId, exportId }: DownloadDataExportParams): Promise<DataExportDownload> {
    const dataExport = await this.exportsRepository.findForUser({ userId, id: exportId })
    const now = new Date()

    if (!dataExport?.storageKey || dataExportStatus({ dataExport, now }) !== DataExportStatus.READY)
      throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    const ttlMs = minutesToMs(DATA_EXPORT_DOWNLOAD_URL_TTL_MINUTES)

    const url = await this.storage.createDownloadUrl({
      key: dataExport.storageKey,
      fileName: `contraponha-dados.${dataExport.format}`,
      expiresInSeconds: msToSeconds(ttlMs),
    })

    return { url, expiresAt: new Date(now.getTime() + ttlMs).toISOString() }
  }

  // Processes one pending export. Returns false when there was nothing to do.
  async processNext(): Promise<boolean> {
    const claimed = await this.exportsRepository.claimNextPending()

    if (!claimed) return false

    try {
      await this.build(claimed)
    } catch (error) {
      this.logger.error({ err: error, exportId: claimed.id }, "Data export failed")

      await this.exportsRepository.markFailed(claimed.id)
    }

    return true
  }

  // Files past their retention are deleted from storage; the row stays as history.
  async removeExpiredFiles(): Promise<void> {
    const expired = await this.exportsRepository.listExpiredWithFiles(new Date())

    await this.storage.delete(expired.flatMap(({ storageKey }) => (storageKey ? [storageKey] : [])))

    await this.exportsRepository.clearStorageKeys(expired.map(({ id }) => id))
  }

  private async build(dataExport: DataExport): Promise<void> {
    const document: ExportDocument = {}

    for (const section of dataExport.sections)
      document[section] = await this.loadSection({ section, userId: dataExport.userId })

    const body =
      dataExport.format === "json" ? renderJsonExport(document) : renderHtmlExport(document)

    const storageKey = `exports/${dataExport.userId}/${dataExport.id}.${dataExport.format}`

    await this.storage.put({
      key: storageKey,
      body,
      contentType: EXPORT_CONTENT_TYPES[dataExport.format],
    })

    await this.exportsRepository.markReady({
      id: dataExport.id,
      storageKey,
      expiresAt: new Date(Date.now() + daysToMs(DATA_EXPORT_RETENTION_DAYS)),
    })

    await this.accountVerification.sendDataExportReady(dataExport.userId)
  }

  private loadSection({ section, userId }: LoadSectionParams): Promise<Record<string, unknown>> {
    switch (section) {
      case "account":
        return this.accountData.account(userId)
      case "content":
        return this.accountData.content(userId)
      case "reactions":
        return this.accountData.reactions(userId)
      case "connections":
        return this.accountData.connections(userId)
      case "recommendations":
        return this.accountData.recommendations(userId)
      case "reports":
        return this.accountData.reports(userId)
    }
  }
}
