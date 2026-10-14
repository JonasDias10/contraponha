import type { MediaAssetRow } from "@contraponha/database"
import type { MediaView } from "@contraponha/types"

export type MediaAsset = MediaAssetRow

export interface ToMediaViewParams {
  asset: MediaAsset
  publicUrl: (key: string) => string
}

export function toMediaView({ asset, publicUrl }: ToMediaViewParams): MediaView {
  const variants = (asset.variants ?? [])
    .map(({ key, width, height }) => ({ url: publicUrl(key), width, height }))
    .toSorted((first, second) => first.width - second.width)

  const largest = variants.at(-1)

  return {
    id: asset.id,
    url: largest?.url ?? publicUrl(asset.storageKey),
    mimeType: largest ? "image/webp" : asset.mimeType,
    sizeBytes: asset.sizeBytes,
    width: asset.width,
    height: asset.height,
    variants,
  }
}
