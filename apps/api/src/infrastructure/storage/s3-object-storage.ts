import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  NotFound,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common"

import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"

import {
  ObjectStorage,
  PUBLIC_OBJECT_PREFIX,
  type CreateDownloadUrlParams,
  type CreateUploadUrlParams,
  type PutObjectParams,
  type ReadObjectPrefixParams,
  type StoredObject,
  type UploadUrl,
} from "./object-storage.js"

// Content type and length are part of the signature, so the storage rejects any upload
// whose type or size differs from what the API validated.
const SIGNED_UPLOAD_HEADERS = new Set(["content-type", "content-length"])

@Injectable()
export class S3ObjectStorage extends ObjectStorage implements OnModuleInit {
  private readonly logger = new Logger(S3ObjectStorage.name)
  private readonly client: S3Client
  private readonly bucket: string

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super()

    const { endpoint, region, bucket, accessKeyId, secretAccessKey, forcePathStyle } =
      config.storage

    this.bucket = bucket

    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.storage.autoCreateBucket) return

    await this.ensurePublicBucket()
  }

  async createUploadUrl({
    key,
    contentType,
    contentLength,
    expiresInSeconds,
  }: CreateUploadUrlParams): Promise<UploadUrl> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    })

    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
      signableHeaders: SIGNED_UPLOAD_HEADERS,
    })

    return { url, headers: { "content-type": contentType } }
  }

  async put({ key, body, contentType }: PutObjectParams): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    )
  }

  createDownloadUrl({ key, fileName, expiresInSeconds }: CreateDownloadUrlParams): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
    })

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds })
  }

  async head(key: string): Promise<StoredObject | undefined> {
    try {
      const object = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      )

      return { contentType: object.ContentType, contentLength: object.ContentLength }
    } catch (error) {
      if (error instanceof NotFound) return undefined

      throw error
    }
  }

  async readPrefix({ key, bytes }: ReadObjectPrefixParams): Promise<Uint8Array> {
    const object = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=0-${bytes - 1}` }),
    )

    if (!object.Body) return new Uint8Array()

    return object.Body.transformToByteArray()
  }

  async delete(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return

    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((key) => ({ Key: key })), Quiet: true },
      }),
    )
  }

  publicUrl(key: string): string {
    return `${this.config.media.publicBaseUrl}/${key}`
  }

  // The policy is reapplied on every start so it always matches PUBLIC_OBJECT_PREFIX.
  private async ensurePublicBucket(): Promise<void> {
    const exists = await this.bucketExists()

    if (!exists) await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }))

    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${this.bucket}/${PUBLIC_OBJECT_PREFIX}*`],
        },
      ],
    }

    await this.client.send(
      new PutBucketPolicyCommand({ Bucket: this.bucket, Policy: JSON.stringify(policy) }),
    )

    // Browsers upload straight to the bucket with presigned URLs, so the web app's origin
    // must be allowed to PUT.
    await this.client.send(
      new PutBucketCorsCommand({
        Bucket: this.bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: [this.config.webAppUrl, ...this.config.http.corsOrigins],
              AllowedMethods: ["PUT", "GET"],
              AllowedHeaders: ["content-type"],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      }),
    )

    if (!exists) this.logger.log({ bucket: this.bucket }, "Created media bucket")
  }

  private async bucketExists(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }))

      return true
    } catch (error) {
      if (error instanceof NotFound) return false

      throw error
    }
  }
}
