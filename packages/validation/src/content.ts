import {
  EDIT_REASON_MAX_LENGTH,
  POST_TOPICS_MAX,
  SOURCE_TITLE_MAX_LENGTH,
  SOURCE_URL_MAX_LENGTH,
  TOPIC_NAME_MAX_LENGTH,
} from "@ponto/config"
import { ReplyPolicy, type ContentSource } from "@ponto/types"
import { z } from "zod"

const HTTP_PROTOCOLS = new Set(["http:", "https:"])

export const httpUrlSchema = z
  .string()
  .trim()
  .max(SOURCE_URL_MAX_LENGTH)
  .pipe(z.url())
  .refine((value) => HTTP_PROTOCOLS.has(new URL(value).protocol), {
    message: "Only http and https links are allowed",
  })

export const sourceInputSchema = z.object({
  url: httpUrlSchema,
  title: z
    .string()
    .trim()
    .max(SOURCE_TITLE_MAX_LENGTH)
    .transform((title) => (title.length === 0 ? null : title))
    .nullable()
    .optional(),
})

export type SourceInput = z.input<typeof sourceInputSchema>

export function sourceListSchema(
  max: number,
): z.ZodType<z.output<typeof sourceInputSchema>[], z.input<typeof sourceInputSchema>[]> {
  return z
    .array(sourceInputSchema)
    .max(max)
    .refine((sources) => new Set(sources.map(({ url }) => url)).size === sources.length, {
      message: "Sources must be unique",
    })
}

export const contentSourceSchema = z.object({
  url: z.string(),
  title: z.string().nullable(),
  host: z.string(),
}) satisfies z.ZodType<ContentSource>

export const replyPolicySchema = z.enum(ReplyPolicy)

// Accepts "Mobilidade urbana", "#tarifazero" or a slug; the API turns it into a slug.
export const topicNameSchema = z
  .string()
  .trim()
  .transform((name) => name.replace(/^#+/, "").trim())
  .pipe(z.string().min(1).max(TOPIC_NAME_MAX_LENGTH))

export const topicNameListSchema = z.array(topicNameSchema).max(POST_TOPICS_MAX)

export const editReasonSchema = z
  .string()
  .trim()
  .max(EDIT_REASON_MAX_LENGTH)
  .transform((reason) => (reason.length === 0 ? null : reason))
