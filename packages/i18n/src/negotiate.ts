import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "./locales.js"

export interface NegotiateLocaleOptions {
  acceptLanguage: string | null | undefined
  supported?: readonly Locale[]
  fallback?: Locale
}

interface WeightedTag {
  tag: string
  quality: number
}

function parseAcceptLanguage(header: string): WeightedTag[] {
  return header
    .split(",")
    .map((part) => {
      const [rawTag = "", ...params] = part.trim().split(";")
      const qualityParam = params.find((param) => param.trim().startsWith("q="))
      const quality = qualityParam ? Number(qualityParam.trim().slice(2)) : 1
      return { tag: rawTag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0 }
    })
    .filter(({ tag, quality }) => tag.length > 0 && tag !== "*" && quality > 0)
    .sort((a, b) => b.quality - a.quality)
}

interface MatchTagParams {
  tag: string
  supported: readonly Locale[]
}

function matchTag({ tag, supported }: MatchTagParams): Locale | undefined {
  const exact = supported.find((locale) => locale.toLowerCase() === tag)

  if (exact) return exact

  const language = tag.split("-")[0]
  return supported.find((locale) => locale.toLowerCase().split("-")[0] === language)
}

export function negotiateLocale({
  acceptLanguage,
  supported = SUPPORTED_LOCALES,
  fallback = DEFAULT_LOCALE,
}: NegotiateLocaleOptions): Locale {
  if (!acceptLanguage) return fallback

  for (const { tag } of parseAcceptLanguage(acceptLanguage)) {
    const match = matchTag({ tag, supported })

    if (match) return match
  }
  return fallback
}
