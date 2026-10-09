export const MediaPurpose = {
  POST: "post",
  AVATAR: "avatar",
} as const

export type MediaPurpose = (typeof MediaPurpose)[keyof typeof MediaPurpose]

export interface MediaView {
  id: string
  url: string
  mimeType: string
  sizeBytes: number
}

export interface MediaUploadTicket {
  mediaId: string
  uploadUrl: string
  method: "PUT"
  headers: Record<string, string>
  expiresAt: string
}
