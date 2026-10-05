import { Module } from "@nestjs/common"

import { UsersModule } from "#src/modules/users/users.module.js"

import { PostsController } from "#src/modules/posts/controllers/posts.controller.js"
import { UserPostsController } from "#src/modules/posts/controllers/user-posts.controller.js"
import { PostRevisionsRepository } from "#src/modules/posts/repositories/post-revisions.repository.js"
import { PostsRepository } from "#src/modules/posts/repositories/posts.repository.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"

@Module({
  imports: [UsersModule],
  controllers: [PostsController, UserPostsController],
  providers: [PostsRepository, PostRevisionsRepository, PostsService],
  exports: [PostsService],
})
export class PostsModule {}
