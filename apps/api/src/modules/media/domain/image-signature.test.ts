import { describe, expect, it } from "vitest"

import { detectImageType } from "./image-signature.js"

function bytes(hex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(hex, "hex"))
}

describe("detectImageType", () => {
  it("recognizes JPEG, PNG and WebP by their magic bytes", () => {
    expect(detectImageType(bytes("ffd8ffe000104a4649460001"))).toBe("image/jpeg")

    expect(detectImageType(bytes("89504e470d0a1a0a0000000d"))).toBe("image/png")

    expect(detectImageType(bytes("524946462400000057454250"))).toBe("image/webp")
  })

  it("rejects other content, including files renamed to an image extension", () => {
    expect(detectImageType(bytes("3c68746d6c3e3c626f64793e"))).toBeUndefined()

    expect(detectImageType(bytes("25504446"))).toBeUndefined()

    expect(detectImageType(bytes("5249464624000000415649"))).toBeUndefined()

    expect(detectImageType(new Uint8Array())).toBeUndefined()
  })
})
