import { Module } from "@nestjs/common"

import { CommentsModule } from "#src/modules/comments/comments.module.js"
import { ModerationController } from "#src/modules/moderation/controllers/moderation.controller.js"
import { ReportsController } from "#src/modules/moderation/controllers/reports.controller.js"
import { ModerationActionsRepository } from "#src/modules/moderation/repositories/moderation-actions.repository.js"
import { ReportsRepository } from "#src/modules/moderation/repositories/reports.repository.js"
import { ModerationService } from "#src/modules/moderation/services/moderation.service.js"
import { ReportsService } from "#src/modules/moderation/services/reports.service.js"
import { PostsModule } from "#src/modules/posts/posts.module.js"
import { UsersModule } from "#src/modules/users/users.module.js"

@Module({
  imports: [PostsModule, CommentsModule, UsersModule],
  controllers: [ReportsController, ModerationController],
  providers: [ReportsRepository, ModerationActionsRepository, ReportsService, ModerationService],
})
export class ModerationModule {}
