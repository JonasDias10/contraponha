import { Module } from "@nestjs/common"

import { FeedController } from "#src/modules/feed/controllers/feed.controller.js"
import { FeedRepository } from "#src/modules/feed/repositories/feed.repository.js"
import { FeedService } from "#src/modules/feed/services/feed.service.js"
import { PostsModule } from "#src/modules/posts/posts.module.js"

@Module({
  imports: [PostsModule],
  controllers: [FeedController],
  providers: [FeedRepository, FeedService],
})
export class FeedModule {}
