import { Parser } from "htmlparser2"

export interface OpenGraphData {
  title: string | null
  description: string | null
  siteName: string | null
  imageUrl: string | null
}

const TITLE_MAX_LENGTH = 200
const DESCRIPTION_MAX_LENGTH = 300

const KEYS: Record<string, keyof OpenGraphData> = {
  "og:title": "title",
  "twitter:title": "title",
  "og:description": "description",
  "twitter:description": "description",
  description: "description",
  "og:site_name": "siteName",
  "og:image": "imageUrl",
  "og:image:url": "imageUrl",
  "og:image:secure_url": "imageUrl",
  "twitter:image": "imageUrl",
}

interface CleanParams {
  value: string | undefined
  maxLength: number
}

function clean({ value, maxLength }: CleanParams): string | null {
  const text = value?.replace(/\s+/g, " ").trim()

  if (!text) return null

  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text
}

interface AbsoluteUrlParams {
  value: string | undefined
  base: string
}

function absoluteHttpUrl({ value, base }: AbsoluteUrlParams): string | null {
  if (!value) return null

  try {
    const url = new URL(value, base)

    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

export interface ParseOpenGraphParams {
  html: string
  pageUrl: string
}

// Reads Open Graph and Twitter card tags from the document head, falling back to <title>
// and the meta description. The first value of each field wins.
export function parseOpenGraph({ html, pageUrl }: ParseOpenGraphParams): OpenGraphData {
  const found: Partial<Record<keyof OpenGraphData, string>> = {}
  let documentTitle = ""
  let isInTitle = false

  const parser = new Parser(
    {
      onopentag(name, attributes) {
        if (name === "title") isInTitle = true

        if (name !== "meta") return

        const key = KEYS[(attributes.property ?? attributes.name ?? "").toLowerCase()]

        if (key && attributes.content && found[key] === undefined) found[key] = attributes.content
      },
      ontext(text) {
        if (isInTitle) documentTitle += text
      },
      onclosetag(name) {
        if (name === "title") isInTitle = false

        if (name === "head") parser.pause()
      },
    },
    { decodeEntities: true, lowerCaseAttributeNames: true },
  )

  parser.write(html)

  parser.end()

  return {
    title: clean({ value: found.title ?? documentTitle, maxLength: TITLE_MAX_LENGTH }),
    description: clean({ value: found.description, maxLength: DESCRIPTION_MAX_LENGTH }),
    siteName: clean({ value: found.siteName, maxLength: TITLE_MAX_LENGTH }),
    imageUrl: absoluteHttpUrl({ value: found.imageUrl, base: pageUrl }),
  }
}
