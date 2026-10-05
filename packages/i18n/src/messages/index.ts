import type { Locale } from "../locales.js"
import type { PartialMessages } from "../types.js"
import { en } from "./en/index.js"
import { es } from "./es/index.js"
import { ptBR } from "./pt-BR/index.js"

export const catalogs: Record<Locale, PartialMessages> = {
  "pt-BR": ptBR,
  en,
  es,
}
