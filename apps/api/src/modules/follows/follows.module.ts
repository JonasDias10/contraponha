import { Module } from "@nestjs/common"

import { FollowsController } from "#src/modules/follows/controllers/follows.controller.js"
import { FollowsRepository } from "#src/modules/follows/repositories/follows.repository.js"
import { FollowsService } from "#src/modules/follows/services/follows.service.js"
import { NotificationsModule } from "#src/modules/notifications/notifications.module.js"
import { UsersModule } from "#src/modules/users/users.module.js"

@Module({
  imports: [UsersModule, NotificationsModule],
  controllers: [FollowsController],
  providers: [FollowsRepository, FollowsService],
})
export class FollowsModule {}
