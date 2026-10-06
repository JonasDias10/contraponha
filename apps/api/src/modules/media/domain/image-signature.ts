export const IMAGE_SIGNATURE_BYTES = 12

interface ImageSignature {
  mimeType: string
  matches: (bytes: Uint8Array) => boolean
}

interface StartsWithParams {
  bytes: Uint8Array
  prefix: number[]
  offset?: number
}

function startsWith({ bytes, prefix, offset = 0 }: StartsWithParams): boolean {
  return prefix.every((value, index) => bytes[offset + index] === value)
}

const ASCII_RIFF = [0x52, 0x49, 0x46, 0x46]
const ASCII_WEBP = [0x57, 0x45, 0x42, 0x50]

const SIGNATURES: ImageSignature[] = [
  { mimeType: "image/jpeg", matches: (bytes) => startsWith({ bytes, prefix: [0xff, 0xd8, 0xff] }) },
  {
    mimeType: "image/png",
    matches: (bytes) =>
      startsWith({ bytes, prefix: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }),
  },
  {
    mimeType: "image/webp",
    matches: (bytes) =>
      startsWith({ bytes, prefix: ASCII_RIFF }) &&
      startsWith({ bytes, prefix: ASCII_WEBP, offset: 8 }),
  },
]

// Identifies the image format from its magic bytes instead of trusting the declared type.
export function detectImageType(bytes: Uint8Array): string | undefined {
  return SIGNATURES.find((signature) => signature.matches(bytes))?.mimeType
}
