import type { DataExportRow } from "@ponto/database"
import { DataExportStatus, type DataExportSection, type DataExportView } from "@ponto/types"

export type DataExport = DataExportRow

export interface DataExportStatusParams {
  dataExport: Pick<DataExport, "status" | "expiresAt">
  now: Date
}

export function dataExportStatus({ dataExport, now }: DataExportStatusParams): DataExportStatus {
  const { status, expiresAt } = dataExport

  if (status === DataExportStatus.READY && expiresAt && expiresAt <= now)
    return DataExportStatus.EXPIRED

  return status
}

export interface ToDataExportViewParams {
  dataExport: DataExport
  now: Date
}

export function toDataExportView({ dataExport, now }: ToDataExportViewParams): DataExportView {
  return {
    id: dataExport.id,
    format: dataExport.format,
    sections: dataExport.sections,
    status: dataExportStatus({ dataExport, now }),
    createdAt: dataExport.createdAt.toISOString(),
    completedAt: dataExport.completedAt?.toISOString() ?? null,
    expiresAt: dataExport.expiresAt?.toISOString() ?? null,
  }
}

// Everything the export contains, already grouped by section. Values are plain JSON.
export type ExportDocument = Partial<Record<DataExportSection, Record<string, unknown>>>

export const EXPORT_CONTENT_TYPES = {
  json: "application/json; charset=utf-8",
  html: "text/html; charset=utf-8",
} as const

export function renderJsonExport(document: ExportDocument): string {
  return JSON.stringify(document, null, 2)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "<em>—</em>"

  if (Array.isArray(value)) {
    if (value.length === 0) return "<em>(vazio)</em>"

    return `<ol>${value.map((item) => `<li>${renderValue(item)}</li>`).join("")}</ol>`
  }

  if (typeof value === "object") {
    const rows = Object.entries(value)
      .map(([key, item]) => `<tr><th>${escapeHtml(key)}</th><td>${renderValue(item)}</td></tr>`)
      .join("")

    return `<table>${rows}</table>`
  }

  const text = typeof value === "string" ? value : JSON.stringify(value)

  return escapeHtml(text).replaceAll("\n", "<br>")
}

// A single self-contained page that opens in any browser, with every value escaped.
export function renderHtmlExport(document: ExportDocument): string {
  const sections = Object.entries(document)
    .map(
      ([section, data]) => `<section><h2>${escapeHtml(section)}</h2>${renderValue(data)}</section>`,
    )
    .join("\n")

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Seus dados no Ponto</title>
<style>
body{font-family:system-ui,sans-serif;max-width:960px;margin:2rem auto;padding:0 1rem;color:#14161a}
table{border-collapse:collapse;width:100%;margin:.5rem 0}
th,td{border:1px solid #e3e6eb;padding:.4rem .6rem;text-align:left;vertical-align:top}
th{width:12rem;background:#f2f3f1;font-weight:600}
</style>
</head>
<body>
<h1>Seus dados no Ponto</h1>
${sections}
</body>
</html>
`
}
