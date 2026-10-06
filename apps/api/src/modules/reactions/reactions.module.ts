import { Module } from "@nestjs/common"

import { CommentsModule } from "#src/modules/comments/comments.module.js"
import { PostsModule } from "#src/modules/posts/posts.module.js"
import { ReactionsController } from "#src/modules/reactions/controllers/reactions.controller.js"
import { ReactionsRepository } from "#src/modules/reactions/repositories/reactions.repository.js"
import { ReactionsService } from "#src/modules/reactions/services/reactions.service.js"

@Module({
  imports: [PostsModule, CommentsModule],
  controllers: [ReactionsController],
  providers: [ReactionsRepository, ReactionsService],
})
export class ReactionsModule {}
