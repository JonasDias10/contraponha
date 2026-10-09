import { Module } from "@nestjs/common"

import { NotificationsModule } from "#src/modules/notifications/notifications.module.js"
import { PushTokensController } from "#src/modules/push/controllers/push-tokens.controller.js"
import { PushTokensRepository } from "#src/modules/push/repositories/push-tokens.repository.js"
import { PushDispatchService } from "#src/modules/push/services/push-dispatch.service.js"
import { PushService } from "#src/modules/push/services/push.service.js"

@Module({
  imports: [NotificationsModule],
  controllers: [PushTokensController],
  providers: [PushTokensRepository, PushService, PushDispatchService],
  exports: [PushDispatchService],
})
export class PushModule {}
