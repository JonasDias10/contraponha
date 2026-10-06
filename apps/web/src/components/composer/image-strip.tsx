"use client"

import { X } from "lucide-react"

import { useI18n } from "@/components/providers/i18n-provider"
import type { UploadedImage } from "@/hooks/use-image-upload"

export interface ImageStripProps {
  images: UploadedImage[]
  onRemove: (mediaId: string) => void
  isUploading: boolean
}

export function ImageStrip({
  images,
  onRemove,
  isUploading,
}: ImageStripProps): React.JSX.Element | null {
  const { t } = useI18n()

  if (images.length === 0 && !isUploading) return null

  return (
    <ul
      aria-label={t("web.composer.imagesLabel")}
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {images.map((image, index) => (
        <li
          key={image.mediaId}
          className="relative overflow-hidden rounded-[12px] bg-surface-sunken"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img
            src={image.previewUrl}
            alt={t("web.composer.imageAlt", { number: index + 1 })}
            className="aspect-square w-full object-cover"
          />
          <button
            type="button"
            aria-label={t("web.composer.removeImage")}
            onClick={() => onRemove(image.mediaId)}
            className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-inverse/80 text-on-inverse"
          >
            <X aria-hidden className="size-4" />
          </button>
        </li>
      ))}
      {isUploading ? (
        <li
          role="status"
          className="grid aspect-square animate-pulse place-items-center rounded-[12px] bg-surface-sunken text-[13px] text-subtle"
        >
          {t("web.composer.uploading")}
        </li>
      ) : null}
    </ul>
  )
}
