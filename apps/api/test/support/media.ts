import type { MediaUploadTicket } from "@contraponha/types"
import { mediaUploadTicketSchema } from "@contraponha/validation"
import request from "supertest"

import { bearer, type App } from "./accounts.js"

export const PNG_BYTES = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
  "hex",
)

export interface RequestUploadParams {
  server: App
  token: string
  mimeType?: string
  sizeBytes: number
}

export interface PutObjectParams {
  ticket: MediaUploadTicket
  content: Buffer
}

export interface UploadImageParams {
  server: App
  token: string
  content?: Buffer
}

export async function requestUpload({
  server,
  token,
  mimeType = "image/png",
  sizeBytes,
}: RequestUploadParams): Promise<MediaUploadTicket> {
  const response = await request(server)
    .post("/api/v1/media/uploads")
    .set(bearer(token))
    .send({ mimeType, sizeBytes })
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
}: UploadImageParams): Promise<string> {
  const ticket = await requestUpload({ server, token, sizeBytes: content.length })
  const status = await putObject({ ticket, content })

  if (status !== 200) throw new Error(`Upload failed with status ${status}`)

  return ticket.mediaId
}
