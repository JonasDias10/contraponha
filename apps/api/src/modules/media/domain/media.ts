import type { MediaAssetRow } from "@ponto/database"
import type { MediaView } from "@ponto/types"

export type MediaAsset = MediaAssetRow

export interface ToMediaViewParams {
  asset: MediaAsset
  url: string
}

export function toMediaView({ asset, url }: ToMediaViewParams): MediaView {
  return { id: asset.id, url, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes }
}
