import { Module } from "@nestjs/common"

import { CommentsModule } from "#src/modules/comments/comments.module.js"
import { PostsModule } from "#src/modules/posts/posts.module.js"
import { SearchController } from "#src/modules/search/controllers/search.controller.js"
import { SearchRepository } from "#src/modules/search/repositories/search.repository.js"
import { SearchService } from "#src/modules/search/services/search.service.js"
import { TopicsModule } from "#src/modules/topics/topics.module.js"

@Module({
  imports: [PostsModule, CommentsModule, TopicsModule],
  controllers: [SearchController],
  providers: [SearchRepository, SearchService],
})
export class SearchModule {}
