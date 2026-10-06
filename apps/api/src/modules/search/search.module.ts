import { Module } from "@nestjs/common"

import { PostsModule } from "#src/modules/posts/posts.module.js"
import { SearchController } from "#src/modules/search/controllers/search.controller.js"
import { SearchRepository } from "#src/modules/search/repositories/search.repository.js"
import { SearchService } from "#src/modules/search/services/search.service.js"

@Module({
  imports: [PostsModule],
  controllers: [SearchController],
  providers: [SearchRepository, SearchService],
})
export class SearchModule {}
