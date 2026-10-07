import { errorMessage } from "@contraponha/client-core"
import { MEDIA_ALLOWED_TYPES, MEDIA_MAX_BYTES, MEDIA_MAX_PER_POST } from "@contraponha/config"
import { useMutation } from "@tanstack/react-query"
import * as ImagePicker from "expo-image-picker"
import { useState } from "react"

import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { useToast } from "@/providers/toast-provider"

export interface UploadedImage {
  mediaId: string
  previewUrl: string
}

export interface ImageUploads {
  images: UploadedImage[]
  isUploading: boolean
  pick: () => void
  remove: (mediaId: string) => void
}

class UploadRejectedError extends Error {}

type AllowedType = (typeof MEDIA_ALLOWED_TYPES)[number]

function isAllowedType(type: string): type is AllowedType {
  return MEDIA_ALLOWED_TYPES.some((allowed) => allowed === type)
}

// Files go straight from the phone to storage through a presigned URL; the API checks
// size and content when the post is published.
export function useImageUploads(): ImageUploads {
  const api = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const [images, setImages] = useState<UploadedImage[]>([])

  const upload = useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset): Promise<UploadedImage> => {
      const mimeType = asset.mimeType ?? ""
      const sizeBytes = asset.fileSize ?? 0

      if (!isAllowedType(mimeType) || sizeBytes === 0 || sizeBytes > MEDIA_MAX_BYTES)
        throw new UploadRejectedError(t("web.composer.imageTooBig"))

      const ticket = await api.media.createUpload({ mimeType, sizeBytes })
      const file = await fetch(asset.uri)
      const blob = await file.blob()

      const response = await fetch(ticket.uploadUrl, {
        method: ticket.method,
        headers: ticket.headers,
        body: blob,
      })

      if (!response.ok) throw new UploadRejectedError(t("web.composer.imageTooBig"))

      return { mediaId: ticket.mediaId, previewUrl: asset.uri }
    },
    onSuccess: (image) => setImages((current) => [...current, image]),
    onError: (error) =>
      toast.error(
        error instanceof UploadRejectedError ? error.message : errorMessage({ error, t }),
      ),
  })

  const pick = (): void => {
    const room = MEDIA_MAX_PER_POST - images.length

    if (room <= 0) {
      toast.show(t("web.composer.imageLimit"))

      return
    }

    void ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: room,
      quality: 0.85,
    }).then((result) => {
      if (result.canceled) return

      for (const asset of result.assets.slice(0, room)) upload.mutate(asset)
    })
  }

  const remove = (mediaId: string): void => {
    setImages((current) => current.filter((image) => image.mediaId !== mediaId))
  }

  return { images, isUploading: upload.isPending, pick, remove }
}
