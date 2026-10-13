import type { MediaPurpose, MediaUploadTicket } from "@contraponha/types"
import { mediaUploadTicketSchema } from "@contraponha/validation"
import request from "supertest"

import { bearer, type App } from "./accounts.js"

// A real 4x4 PNG: post images are decoded and re-encoded, so the bytes must be a valid image.
export const PNG_BYTES = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000004000000040802000000269309290000000970485973000003e8" +
    "000003e801b57b526b000000104944415408996390f7bf01470cc471000682146134710abd0000000049454e44ae426082",
  "hex",
)

export interface RequestUploadParams {
  server: App
  token: string
  mimeType?: string
  sizeBytes: number
  purpose?: MediaPurpose
}

export interface PutObjectParams {
  ticket: MediaUploadTicket
  content: Buffer
}

export interface UploadImageParams {
  server: App
  token: string
  content?: Buffer
  purpose?: MediaPurpose
}

export async function requestUpload({
  server,
  token,
  mimeType = "image/png",
  sizeBytes,
  purpose,
}: RequestUploadParams): Promise<MediaUploadTicket> {
  const response = await request(server)
    .post("/api/v1/media/uploads")
    .set(bearer(token))
    .send({ mimeType, sizeBytes, purpose })
    .expect(201)

  return mediaUploadTicketSchema.parse(response.body)
}

export async function putObject({ ticket, content }: PutObjectParams): Promise<number> {
  const response = await fetch(ticket.uploadUrl, {
    method: ticket.method,
    headers: ticket.headers,
    body: content,
  })

  return response.status
}

export async function uploadImage({
  server,
  token,
  content = PNG_BYTES,
  purpose,
}: UploadImageParams): Promise<string> {
  const ticket = await requestUpload({ server, token, sizeBytes: content.length, purpose })
  const status = await putObject({ ticket, content })

  if (status !== 200) throw new Error(`Upload failed with status ${status}`)

  return ticket.mediaId
}
