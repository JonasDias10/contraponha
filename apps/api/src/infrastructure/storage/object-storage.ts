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

// Provider-neutral object storage. The S3 implementation works with any S3-compatible
// service, including providers with Brazilian regions.
export abstract class ObjectStorage {
  abstract createUploadUrl(params: CreateUploadUrlParams): Promise<UploadUrl>
  abstract head(key: string): Promise<StoredObject | undefined>
  abstract readPrefix(params: ReadObjectPrefixParams): Promise<Uint8Array>
  abstract delete(keys: readonly string[]): Promise<void>
  abstract publicUrl(key: string): string
}
