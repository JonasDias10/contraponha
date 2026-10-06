import { POST_SOURCES_MAX, POST_TOPICS_MAX, SOURCE_TITLE_MAX_LENGTH } from "@ponto/config"
import {
  editReasonSchema,
  httpUrlSchema,
  postBodySchema,
  postTitleSchema,
  replyPolicySchema,
  topicNameSchema,
} from "@ponto/validation"
import type { Control } from "react-hook-form"
import { z } from "zod"

// The form keeps empty source rows while typing; they are dropped when publishing.
export const composerSchema = z.object({
  title: postTitleSchema,
  body: postBodySchema,
  sources: z
    .array(
      z.object({
        url: z.union([httpUrlSchema, z.literal("")]),
        title: z.string().trim().max(SOURCE_TITLE_MAX_LENGTH),
      }),
    )
    .max(POST_SOURCES_MAX),
  topics: z.array(topicNameSchema).max(POST_TOPICS_MAX),
  replyPolicy: replyPolicySchema,
  reason: editReasonSchema,
})

export type ComposerValues = z.input<typeof composerSchema>

export type ComposerOutput = z.output<typeof composerSchema>

export type ComposerControl = Control<ComposerValues, unknown, ComposerOutput>

export const EMPTY_COMPOSER: ComposerValues = {
  title: "",
  body: "",
  sources: [],
  topics: [],
  replyPolicy: "everyone",
  reason: "",
}

export interface FilledSource {
  url: string
  title: string | null
}

export function filledSources(sources: ComposerValues["sources"]): FilledSource[] {
  return sources
    .filter(({ url }) => url.trim() !== "")
    .map(({ url, title }) => ({ url: url.trim(), title: title.trim() || null }))
}

// Shape of a draft kept in the browser, checked before it is restored.
export const composerDraftSchema = z.object({
  title: z.string(),
  body: z.string(),
  sources: z.array(z.object({ url: z.string(), title: z.string() })),
  topics: z.array(z.string()),
  replyPolicy: replyPolicySchema,
  reason: z.string(),
}) satisfies z.ZodType<ComposerValues>
