import type { MediaUploadTicket } from "@contraponha/types"
import { mediaUploadTicketSchema, type CreateMediaUploadInput } from "@contraponha/validation"

import type { HttpClient } from "../http.js"

export interface MediaResource {
  createUpload(input: CreateMediaUploadInput): Promise<MediaUploadTicket>
}

export function createMediaResource(request: HttpClient): MediaResource {
  return {
    createUpload: (input) =>
      request({
        method: "POST",
        path: "/media/uploads",
        body: input,
        schema: mediaUploadTicketSchema,
      }),
  }
}
