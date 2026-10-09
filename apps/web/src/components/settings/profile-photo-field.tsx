"use client"

import { MEDIA_ALLOWED_TYPES } from "@contraponha/config"
import type { PrivateProfile } from "@contraponha/types"
import { useProfilePhoto } from "@contraponha/client-core/react"
import { useRef } from "react"
import { toast } from "sonner"

import { useI18n } from "@/components/providers/i18n-provider"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { squareJpeg } from "@/lib/square-image"

interface ProfilePhotoFieldProps {
  viewer: PrivateProfile
}

function isAllowedImage(file: File): boolean {
  return MEDIA_ALLOWED_TYPES.some((type) => type === file.type)
}

export function ProfilePhotoField({ viewer }: ProfilePhotoFieldProps): React.JSX.Element {
  const { t } = useI18n()
  const photo = useProfilePhoto()
  const inputRef = useRef<HTMLInputElement>(null)
  const isBusy = photo.isUploading || photo.isRemoving

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file) return

    if (!isAllowedImage(file)) {
      toast.error(t("web.settings.photoInvalid"))

      return
    }

    try {
      const body = await squareJpeg(file)

      photo.upload({ body, mimeType: "image/jpeg" })
    } catch {
      toast.error(t("web.settings.photoFailed"))
    }
  }

  return (
    <div className="flex items-center gap-5">
      <Avatar id={viewer.id} name={viewer.displayName} src={viewer.avatarUrl} size="xl" />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink">{t("web.settings.photo")}</span>
        <p className="text-[13px] text-subtle">{t("web.settings.photoHint")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={photo.isUploading}
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
          >
            {viewer.avatarUrl ? t("web.settings.photoChange") : t("web.settings.photoChoose")}
          </Button>
          {viewer.avatarUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isLoading={photo.isRemoving}
              disabled={isBusy}
              onClick={photo.remove}
            >
              {t("web.settings.photoRemove")}
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={MEDIA_ALLOWED_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            void handleFile(event.target.files?.[0])

            event.target.value = ""
          }}
        />
      </div>
    </div>
  )
}
