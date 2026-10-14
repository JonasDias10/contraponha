import { Module } from "@nestjs/common"

import { LinkPreviewsRepository } from "#src/modules/link-previews/repositories/link-previews.repository.js"
import { LinkPreviewsService } from "#src/modules/link-previews/services/link-previews.service.js"

@Module({
  providers: [LinkPreviewsRepository, LinkPreviewsService],
  exports: [LinkPreviewsService],
})
export class LinkPreviewsModule {}
