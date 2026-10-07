import { Module } from "@nestjs/common"

import { AccountController } from "#src/modules/accounts/controllers/account.controller.js"
import { AccountDataRepository } from "#src/modules/accounts/repositories/account-data.repository.js"
import { DataExportsRepository } from "#src/modules/accounts/repositories/data-exports.repository.js"
import { AccountDeletionService } from "#src/modules/accounts/services/account-deletion.service.js"
import { BackgroundJobsService } from "#src/modules/accounts/services/background-jobs.service.js"
import { DataExportsService } from "#src/modules/accounts/services/data-exports.service.js"
import { AuthModule } from "#src/modules/auth/auth.module.js"
import { BookmarksModule } from "#src/modules/bookmarks/bookmarks.module.js"
import { CommentsModule } from "#src/modules/comments/comments.module.js"
import { FollowsModule } from "#src/modules/follows/follows.module.js"
import { MediaModule } from "#src/modules/media/media.module.js"
import { NotificationsModule } from "#src/modules/notifications/notifications.module.js"
import { PostsModule } from "#src/modules/posts/posts.module.js"
import { ReactionsModule } from "#src/modules/reactions/reactions.module.js"
import { TopicsModule } from "#src/modules/topics/topics.module.js"
import { UsersModule } from "#src/modules/users/users.module.js"

@Module({
  imports: [
    UsersModule,
    AuthModule,
    PostsModule,
    CommentsModule,
    ReactionsModule,
    FollowsModule,
    TopicsModule,
    BookmarksModule,
    NotificationsModule,
    MediaModule,
  ],
  controllers: [AccountController],
  providers: [
    DataExportsRepository,
    AccountDataRepository,
    DataExportsService,
    AccountDeletionService,
    BackgroundJobsService,
  ],
})
export class AccountsModule {}
