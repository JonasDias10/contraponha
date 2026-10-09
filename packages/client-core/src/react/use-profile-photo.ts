"use client"

import type { PrivateProfile } from "@contraponha/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { errorMessage } from "../api-errors.js"
import { queryKeys } from "../query-keys.js"
import { useClient } from "./client-context.js"

// The storage refused the file; the message is already in the reader's language.
class PhotoUploadError extends Error {}

export interface ProfilePhotoFile {
  body: Blob
  mimeType: "image/jpeg" | "image/png" | "image/webp"
}

export interface ProfilePhoto {
  upload: (file: ProfilePhotoFile) => void
  remove: () => void
  isUploading: boolean
  isRemoving: boolean
}

// The app prepares the image (square crop, resized) before calling upload; the file goes
// straight to storage with a presigned URL and the API checks it before using it.
export function useProfilePhoto(): ProfilePhoto {
  const { api, t, notify } = useClient()
  const queryClient = useQueryClient()

  const applyProfile = async (profile: PrivateProfile): Promise<void> => {
    queryClient.setQueryData(queryKeys.me, profile)

    await queryClient.invalidateQueries({ queryKey: queryKeys.profile(profile.handle) })
  }

  const upload = useMutation({
    mutationFn: async ({ body, mimeType }: ProfilePhotoFile): Promise<PrivateProfile> => {
      const ticket = await api.media.createUpload({
        mimeType,
        sizeBytes: body.size,
        purpose: "avatar",
      })

      const response = await fetch(ticket.uploadUrl, {
        method: ticket.method,
        headers: ticket.headers,
        body,
      })

      if (!response.ok) throw new PhotoUploadError(t("web.settings.photoFailed"))

      return api.users.setAvatar({ mediaId: ticket.mediaId })
    },
    onSuccess: async (profile) => {
      await applyProfile(profile)

      notify.success(t("web.settings.photoSaved"))
    },
    onError: (error) =>
      notify.error(error instanceof PhotoUploadError ? error.message : errorMessage({ error, t })),
  })

  const remove = useMutation({
    mutationFn: () => api.users.removeAvatar(),
    onSuccess: async (profile) => {
      await applyProfile(profile)

      notify.success(t("web.settings.photoRemoved"))
    },
    onError: (error) => notify.error(errorMessage({ error, t })),
  })

  return {
    upload: (file) => upload.mutate(file),
    remove: () => remove.mutate(),
    isUploading: upload.isPending,
    isRemoving: remove.isPending,
  }
}
