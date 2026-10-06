import { Module } from "@nestjs/common"

import { BookmarksController } from "#src/modules/bookmarks/controllers/bookmarks.controller.js"
import { BookmarksRepository } from "#src/modules/bookmarks/repositories/bookmarks.repository.js"
import { BookmarksService } from "#src/modules/bookmarks/services/bookmarks.service.js"
import { PostsModule } from "#src/modules/posts/posts.module.js"

@Module({
  imports: [PostsModule],
  controllers: [BookmarksController],
  providers: [BookmarksRepository, BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
