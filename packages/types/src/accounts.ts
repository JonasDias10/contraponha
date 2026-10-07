export const LegalDocument = {
  TERMS: "terms",
  PRIVACY: "privacy",
  GUIDELINES: "guidelines",
} as const

export type LegalDocument = (typeof LegalDocument)[keyof typeof LegalDocument]

export const DataExportFormat = {
  HTML: "html",
  JSON: "json",
} as const

export type DataExportFormat = (typeof DataExportFormat)[keyof typeof DataExportFormat]

export const DataExportSection = {
  CONTENT: "content",
  REACTIONS: "reactions",
  CONNECTIONS: "connections",
  ACCOUNT: "account",
  RECOMMENDATIONS: "recommendations",
  REPORTS: "reports",
} as const

export type DataExportSection = (typeof DataExportSection)[keyof typeof DataExportSection]

export const DataExportStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
  EXPIRED: "expired",
} as const

export type DataExportStatus = (typeof DataExportStatus)[keyof typeof DataExportStatus]

export interface DataExportView {
  id: string
  format: DataExportFormat
  sections: DataExportSection[]
  status: DataExportStatus
  createdAt: string
  completedAt: string | null
  expiresAt: string | null
}

export interface DataExportList {
  exports: DataExportView[]
}

export interface DataExportDownload {
  url: string
  expiresAt: string
}

export interface AccountDeletionStatus {
  scheduledFor: string | null
  deleteContributions: boolean
}
