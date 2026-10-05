import type { ptBR } from "./messages/pt-BR/index.js"

export type Messages = typeof ptBR

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]>
}

export type PartialMessages = DeepPartial<Messages>

type LeafPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : LeafPaths<T[K], `${Prefix}${K}.`>
}[keyof T & string]

export type MessageKey = LeafPaths<Messages>

export type MessageParams = Record<string, string | number>
