import { Module } from "@nestjs/common"
import { UsersModule } from "#src/modules/users/users.module.js"

import { FeedController } from "#src/modules/feed/controllers/feed.controller.js"
import { FeedRepository } from "#src/modules/feed/repositories/feed.repository.js"
import { FeedService } from "#src/modules/feed/services/feed.service.js"
import { PostsModule } from "#src/modules/posts/posts.module.js"
import { TopicsModule } from "#src/modules/topics/topics.module.js"

@Module({
  imports: [PostsModule, TopicsModule, UsersModule],
  controllers: [FeedController],
  providers: [FeedRepository, FeedService],
})
export class FeedModule {}
