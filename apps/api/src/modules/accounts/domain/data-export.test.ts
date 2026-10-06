import { describe, expect, it } from "vitest"

import { dataExportStatus, renderHtmlExport } from "./data-export.js"

describe("renderHtmlExport", () => {
  it("escapes every value so exported text cannot run as markup", () => {
    const html = renderHtmlExport({
      content: { posts: [{ body: "<script>alert(1)</script>" }] },
    })

    expect(html).not.toContain("<script>alert")

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
  })
})

describe("dataExportStatus", () => {
  const now = new Date("2026-10-06T12:00:00Z")

  it("reports a ready export past its retention as expired", () => {
    const dataExport = { status: "ready" as const, expiresAt: new Date("2026-10-05T12:00:00Z") }

    expect(dataExportStatus({ dataExport, now })).toBe("expired")
  })

  it("keeps the status of an export still within retention", () => {
    const dataExport = { status: "ready" as const, expiresAt: new Date("2026-10-07T12:00:00Z") }

    expect(dataExportStatus({ dataExport, now })).toBe("ready")
  })
})
