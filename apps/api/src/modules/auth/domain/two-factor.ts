import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

const CIPHER = "aes-256-gcm"
const IV_BYTES = 12
const TAG_BYTES = 16
const VERSION = "v1"
const RECOVERY_CODE_COUNT = 10
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567"

export interface EncryptSecretParams {
  secret: string
  key: Buffer
}

export interface DecryptSecretParams {
  ciphertext: string
  key: Buffer
}

export function encryptSecret({ secret, key }: EncryptSecretParams): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(CIPHER, key, iv)
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${VERSION}:${Buffer.concat([iv, tag, encrypted]).toString("base64")}`
}

export function decryptSecret({ ciphertext, key }: DecryptSecretParams): string {
  const [version, payload] = ciphertext.split(":")

  if (version !== VERSION || !payload) throw new Error("Unknown two-factor secret format")

  const bytes = Buffer.from(payload, "base64")
  const decipher = createDecipheriv(CIPHER, key, bytes.subarray(0, IV_BYTES))

  decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES))

  return Buffer.concat([
    decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)),
    decipher.final(),
  ]).toString("utf8")
}

function randomGroup(): string {
  return [...randomBytes(4)].map((byte) => BASE32_ALPHABET[byte % 32]).join("")
}

// xxxx-xxxx-xxxx in lowercase base32: 60 random bits each, easy to read and type.
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    [randomGroup(), randomGroup(), randomGroup()].join("-"),
  )
}

// Recovery codes are long random values, so a plain SHA-256 is enough to store them.
export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.trim().toLowerCase()).digest("hex")
}

export function isRecoveryCode(code: string): boolean {
  return code.includes("-")
}
