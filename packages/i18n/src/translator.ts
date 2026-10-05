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
    if (typeof node !== "object" || node === null) {
      return undefined
    }

    node = (node as Record<string, unknown>)[segment]
  }
  return typeof node === "string" ? node : undefined
}

interface InterpolateParams {
  template: string
  params: MessageParams | undefined
}

function interpolate({ template, params }: InterpolateParams): string {
  if (!params) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  )
}

export function createTranslator({
  locale,
  fallbackLocale = DEFAULT_LOCALE,
  catalogs = defaultCatalogs,
}: TranslatorOptions): Translate {
  return (key, params) => {
    const template =
      lookup({ catalog: catalogs[locale], key }) ??
      lookup({ catalog: catalogs[fallbackLocale], key }) ??
      key
    return interpolate({ template, params })
  }
}
