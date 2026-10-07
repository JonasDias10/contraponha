import { Module } from "@nestjs/common"

import { TopicsController } from "#src/modules/topics/controllers/topics.controller.js"
import { TopicsRepository } from "#src/modules/topics/repositories/topics.repository.js"
import { TopicsService } from "#src/modules/topics/services/topics.service.js"

@Module({
  controllers: [TopicsController],
  providers: [TopicsRepository, TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
