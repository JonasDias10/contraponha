import { Module } from "@nestjs/common"

import { CommentsController } from "#src/modules/comments/controllers/comments.controller.js"
import { PostCommentsController } from "#src/modules/comments/controllers/post-comments.controller.js"
import { CommentRevisionsRepository } from "#src/modules/comments/repositories/comment-revisions.repository.js"
import { CommentsRepository } from "#src/modules/comments/repositories/comments.repository.js"
import { CommentsService } from "#src/modules/comments/services/comments.service.js"
import { PostsModule } from "#src/modules/posts/posts.module.js"
import { UsersModule } from "#src/modules/users/users.module.js"

@Module({
  imports: [PostsModule, UsersModule],
  controllers: [PostCommentsController, CommentsController],
  providers: [CommentsRepository, CommentRevisionsRepository, CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
