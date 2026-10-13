import { MEDIA_VARIANT_QUALITY, MEDIA_VARIANT_WIDTHS } from "@contraponha/config"
import sharp from "sharp"

// Refuses decompression bombs: a small file that expands to a huge bitmap.
const MAX_INPUT_PIXELS = 40_000_000

export interface RenderedVariant {
  width: number
  height: number
  body: Uint8Array
}

export interface RenderedImage {
  width: number
  height: number
  variants: RenderedVariant[]
}

// Orients the image from its EXIF data, then re-encodes it to WebP at each width. Metadata
// (camera, GPS location) is not copied, and images are never enlarged, so a small original
// yields fewer variants.
export async function renderVariants(input: Uint8Array): Promise<RenderedImage> {
  const oriented = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate()

  const { width, height } = await oriented
    .clone()
    .toBuffer({ resolveWithObject: true })
    .then(({ info }) => info)

  const widths = [...new Set(MEDIA_VARIANT_WIDTHS.map((target) => Math.min(target, width)))]

  const variants = await Promise.all(
    widths.map(async (target) => {
      const { data, info } = await oriented
        .clone()
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: MEDIA_VARIANT_QUALITY })
        .toBuffer({ resolveWithObject: true })

      return { width: info.width, height: info.height, body: new Uint8Array(data) }
    }),
  )

  return { width, height, variants }
}
