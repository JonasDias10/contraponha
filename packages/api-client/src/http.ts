import { API_BASE_PATH } from "@ponto/config"
import type { Locale } from "@ponto/i18n"
import { apiErrorResponseSchema } from "@ponto/validation"
import type { z } from "zod"

import { ApiError, ApiResponseFormatError } from "./errors.js"

export interface HttpClientOptions {
  baseUrl: string
  locale?: Locale
  fetch?: typeof fetch
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>
}

export interface RequestOptions<TSchema extends z.ZodType> {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string
  schema: TSchema
  body?: unknown
  signal?: AbortSignal
}

export type HttpClient = <TSchema extends z.ZodType>(
  options: RequestOptions<TSchema>,
) => Promise<z.output<TSchema>>

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.length === 0) {
    return null
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

export function createHttpClient({
  baseUrl,
  locale,
  fetch: fetchImpl = globalThis.fetch,
  getHeaders,
}: HttpClientOptions): HttpClient {
  const apiUrl = `${baseUrl.replace(/\/+$/, "")}${API_BASE_PATH}`

  return async ({ method, path, schema, body, signal }) => {
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(locale ? { "accept-language": locale } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(await getHeaders?.()),
    }

    const response = await fetchImpl(`${apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
    const payload = await readJson(response)

    if (!response.ok) {
      const parsedError = apiErrorResponseSchema.safeParse(payload)
      if (!parsedError.success) {
        throw new ApiResponseFormatError(response.status, path)
      }
      throw new ApiError(response.status, parsedError.data.error)
    }

    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      throw new ApiResponseFormatError(response.status, path)
    }
    return parsed.data
  }
}
