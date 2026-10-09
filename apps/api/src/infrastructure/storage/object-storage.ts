export interface CreateUploadUrlParams {
  key: string
  contentType: string
  contentLength: number
  expiresInSeconds: number
}

export interface UploadUrl {
  url: string
  headers: Record<string, string>
}

export interface StoredObject {
  contentType: string | undefined
  contentLength: number | undefined
}

export interface ReadObjectPrefixParams {
  key: string
  bytes: number
}

export interface PutObjectParams {
  key: string
  body: string | Uint8Array
  contentType: string
}

export interface CreateDownloadUrlParams {
  key: string
  fileName: string
  expiresInSeconds: number
}

// Only objects under these prefixes are publicly readable; everything else (data exports)
// is private and downloaded through short-lived signed URLs.
export const PUBLIC_OBJECT_PREFIXES = ["posts/", "avatars/"] as const

// Provider-neutral object storage. The S3 implementation works with any S3-compatible
// service, including providers with Brazilian regions.
export abstract class ObjectStorage {
  abstract createUploadUrl(params: CreateUploadUrlParams): Promise<UploadUrl>
  abstract put(params: PutObjectParams): Promise<void>
  abstract createDownloadUrl(params: CreateDownloadUrlParams): Promise<string>
  abstract head(key: string): Promise<StoredObject | undefined>
  abstract readPrefix(params: ReadObjectPrefixParams): Promise<Uint8Array>
  abstract delete(keys: readonly string[]): Promise<void>
  abstract publicUrl(key: string): string
}
