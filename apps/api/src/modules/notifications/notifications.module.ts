import { Module } from "@nestjs/common"

import { NotificationsController } from "#src/modules/notifications/controllers/notifications.controller.js"
import { NotificationsRepository } from "#src/modules/notifications/repositories/notifications.repository.js"
import { NotificationsService } from "#src/modules/notifications/services/notifications.service.js"
import { UsersModule } from "#src/modules/users/users.module.js"

@Module({
  imports: [UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsRepository, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
