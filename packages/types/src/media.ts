export const MediaPurpose = {
  POST: "post",
  AVATAR: "avatar",
} as const

export type MediaPurpose = (typeof MediaPurpose)[keyof typeof MediaPurpose]

export interface MediaVariantView {
  url: string
  width: number
  height: number
}

export interface MediaView {
  id: string
  // The largest variant, or the upload itself for images processed before variants existed.
  url: string
  mimeType: string
  sizeBytes: number
  width: number | null
  height: number | null
  // Smallest first, for srcset and for picking a size on the phone.
  variants: MediaVariantView[]
}

export interface MediaUploadTicket {
  mediaId: string
  uploadUrl: string
  method: "PUT"
  headers: Record<string, string>
  expiresAt: string
}
