import { DEFAULT_LOCALE, type Locale } from "./locales.js"
import { catalogs as defaultCatalogs } from "./messages/index.js"
import type { MessageKey, MessageParams, PartialMessages } from "./types.js"

export type Translate = (key: MessageKey, params?: MessageParams) => string

export interface LocaleTranslator {
  locale: Locale
  t: Translate
}

export interface TranslatorOptions {
  locale: Locale
  fallbackLocale?: Locale
  catalogs?: Partial<Record<Locale, PartialMessages>>
}

interface LookupParams {
  catalog: PartialMessages | undefined
  key: string
}

function lookup({ catalog, key }: LookupParams): string | undefined {
  let node: unknown = catalog
  for (const segment of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined

    node = (node as Record<string, unknown>)[segment]
  }
  return typeof node === "string" ? node : undefined
}

interface InterpolateParams {
  template: string
  params: MessageParams | undefined
}

function interpolate({ template, params }: InterpolateParams): string {
  if (!params) return template

  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  )
}

interface PluralKeysParams {
  key: string
  locale: Locale
  count: MessageParams[string] | undefined
}

// With a numeric `count`, "key_one" (or another CLDR plural category) is used when the
// catalog has it; the plain key is the general form.
function pluralKeys({ key, locale, count }: PluralKeysParams): string[] {
  // Zero reads as plural in everyday Portuguese, English and Spanish ("0 posts"), even where
  // CLDR files it under "one".
  if (typeof count !== "number" || count === 0) return [key]

  const category = new Intl.PluralRules(locale).select(count)
  return [`${key}_${category}`, key]
}

export function createTranslator({
  locale,
  fallbackLocale = DEFAULT_LOCALE,
  catalogs = defaultCatalogs,
}: TranslatorOptions): Translate {
  return (key, params) => {
    const candidates = pluralKeys({ key, locale, count: params?.count })

    const template =
      candidates
        .map((candidate) => lookup({ catalog: catalogs[locale], key: candidate }))
        .find(Boolean) ??
      candidates
        .map((candidate) => lookup({ catalog: catalogs[fallbackLocale], key: candidate }))
        .find(Boolean) ??
      key

    return interpolate({ template, params })
  }
}
