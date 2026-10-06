import { Module } from "@nestjs/common"

import { MediaController } from "#src/modules/media/controllers/media.controller.js"
import { MediaRepository } from "#src/modules/media/repositories/media.repository.js"
import { MediaService } from "#src/modules/media/services/media.service.js"

@Module({
  controllers: [MediaController],
  providers: [MediaRepository, MediaService],
  exports: [MediaService],
})
export class MediaModule {}
