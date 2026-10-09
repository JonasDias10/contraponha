import { AVATAR_SIZE_PX } from "@contraponha/config"

const JPEG_QUALITY = 0.88

// Center-crops to a square and scales down to the avatar size, so uploads stay small
// whatever the camera produced. EXIF orientation is applied by createImageBitmap.
export async function squareJpeg(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const side = Math.min(bitmap.width, bitmap.height)
  const target = Math.min(side, AVATAR_SIZE_PX)
  const canvas = document.createElement("canvas")

  canvas.width = target

  canvas.height = target

  const context = canvas.getContext("2d")

  if (!context) throw new Error("Canvas 2D context is unavailable")

  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    target,
    target,
  )

  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image"))),
      "image/jpeg",
      JPEG_QUALITY,
    )
  })
}
