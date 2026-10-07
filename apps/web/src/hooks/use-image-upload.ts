"use client"

import { MEDIA_ALLOWED_TYPES, MEDIA_MAX_BYTES, MEDIA_MAX_PER_POST } from "@contraponha/config"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { errorMessage } from "@/lib/api-errors"

export interface UploadedImage {
  mediaId: string
  previewUrl: string
}

export interface ImageUploads {
  images: UploadedImage[]
  isUploading: boolean
  add: (files: FileList | null) => void
  remove: (mediaId: string) => void
  reset: () => void
}

// Our own refusal (wrong type or size), with a message already in the reader's language.
class UploadRejectedError extends Error {}

type AllowedType = (typeof MEDIA_ALLOWED_TYPES)[number]

function isAllowedType(type: string): type is AllowedType {
  return MEDIA_ALLOWED_TYPES.some((allowed) => allowed === type)
}

// Files go straight from the browser to storage through a presigned URL; the API checks
// size and content when the post is published.
export function useImageUploads(): ImageUploads {
  const api = useApi()
  const { t } = useI18n()
  const [images, setImages] = useState<UploadedImage[]>([])

  const upload = useMutation({
    mutationFn: async (file: File): Promise<UploadedImage> => {
      if (!isAllowedType(file.type) || file.size > MEDIA_MAX_BYTES)
        throw new UploadRejectedError(t("web.composer.imageTooBig"))

      const ticket = await api.media.createUpload({ mimeType: file.type, sizeBytes: file.size })

      const response = await fetch(ticket.uploadUrl, {
        method: ticket.method,
        headers: ticket.headers,
        body: file,
      })

      if (!response.ok) throw new UploadRejectedError(t("web.composer.imageTooBig"))

      return { mediaId: ticket.mediaId, previewUrl: URL.createObjectURL(file) }
    },
    onSuccess: (image) => setImages((current) => [...current, image]),
    onError: (error) =>
      toast.error(
        error instanceof UploadRejectedError ? error.message : errorMessage({ error, t }),
      ),
  })

  const add = (files: FileList | null): void => {
    if (!files) return

    const room = MEDIA_MAX_PER_POST - images.length

    if (files.length > room) toast(t("web.composer.imageLimit"))

    for (const file of [...files].slice(0, room)) upload.mutate(file)
  }

  const remove = (mediaId: string): void => {
    setImages((current) => current.filter((image) => image.mediaId !== mediaId))
  }

  return { images, isUploading: upload.isPending, add, remove, reset: () => setImages([]) }
}
