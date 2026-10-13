import sharp from "sharp"
import { describe, expect, it } from "vitest"

import { renderVariants } from "./image-variants.js"

interface SolidImageParams {
  width: number
  height: number
}

async function solidJpeg({ width, height }: SolidImageParams): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 30, g: 80, b: 200 } },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Copyright: "secret location" } } })
    .toBuffer()

  return new Uint8Array(buffer)
}

describe("renderVariants", () => {
  it("makes a WebP per width without enlarging and without metadata", async () => {
    const input = await solidJpeg({ width: 2000, height: 1000 })

    const image = await renderVariants(input)

    expect(image).toMatchObject({ width: 2000, height: 1000 })

    expect(image.variants.map(({ width, height }) => [width, height])).toEqual([
      [640, 320],
      [1600, 800],
    ])

    const metadata = await sharp(image.variants[0]?.body).metadata()

    expect(metadata.format).toBe("webp")

    expect(metadata.exif).toBeUndefined()
  })

  it("keeps a small image at its own size", async () => {
    const input = await solidJpeg({ width: 300, height: 200 })

    const image = await renderVariants(input)

    expect(image.variants.map(({ width }) => width)).toEqual([300])
  })
})
