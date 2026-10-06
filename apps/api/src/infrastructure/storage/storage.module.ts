import { Global, Module } from "@nestjs/common"

import { ObjectStorage } from "#src/infrastructure/storage/object-storage.js"
import { S3ObjectStorage } from "#src/infrastructure/storage/s3-object-storage.js"

@Global()
@Module({
  providers: [{ provide: ObjectStorage, useClass: S3ObjectStorage }],
  exports: [ObjectStorage],
})
export class StorageModule {}
