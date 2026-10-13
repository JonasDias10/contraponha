import { Module } from "@nestjs/common"

import { LinkPreviewsModule } from "#src/modules/link-previews/link-previews.module.js"
import { MediaModule } from "#src/modules/media/media.module.js"
import { NotificationsModule } from "#src/modules/notifications/notifications.module.js"
import { TopicsModule } from "#src/modules/topics/topics.module.js"
import { UsersModule } from "#src/modules/users/users.module.js"

import { PostsController } from "#src/modules/posts/controllers/posts.controller.js"
import { UserPostsController } from "#src/modules/posts/controllers/user-posts.controller.js"
import { PostContextRepository } from "#src/modules/posts/repositories/post-context.repository.js"
import { PostRevisionsRepository } from "#src/modules/posts/repositories/post-revisions.repository.js"
import { PostsRepository } from "#src/modules/posts/repositories/posts.repository.js"
import { RepostsRepository } from "#src/modules/posts/repositories/reposts.repository.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"
import { RepostsService } from "#src/modules/posts/services/reposts.service.js"

@Module({
  imports: [UsersModule, MediaModule, TopicsModule, NotificationsModule, LinkPreviewsModule],
  controllers: [PostsController, UserPostsController],
  providers: [
    PostsRepository,
    PostRevisionsRepository,
    PostContextRepository,
    RepostsRepository,
    PostsService,
    RepostsService,
  ],
  exports: [PostsService, RepostsService],
})
export class PostsModule {}
