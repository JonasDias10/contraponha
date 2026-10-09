import { Module } from "@nestjs/common"

import { AdminMetricsController } from "#src/modules/admin/controllers/admin-metrics.controller.js"
import { AdminTopicsController } from "#src/modules/admin/controllers/admin-topics.controller.js"
import { AdminUsersController } from "#src/modules/admin/controllers/admin-users.controller.js"
import { AdminMetricsRepository } from "#src/modules/admin/repositories/admin-metrics.repository.js"
import { AdminUsersRepository } from "#src/modules/admin/repositories/admin-users.repository.js"
import { AdminMetricsService } from "#src/modules/admin/services/admin-metrics.service.js"
import { AdminTopicsService } from "#src/modules/admin/services/admin-topics.service.js"
import { AdminUsersService } from "#src/modules/admin/services/admin-users.service.js"
import { AuthModule } from "#src/modules/auth/auth.module.js"
import { ModerationModule } from "#src/modules/moderation/moderation.module.js"
import { PushModule } from "#src/modules/push/push.module.js"
import { TopicsModule } from "#src/modules/topics/topics.module.js"
import { UsersModule } from "#src/modules/users/users.module.js"

// Back office for the hub: account management, suspensions, metrics and topic curation.
@Module({
  imports: [UsersModule, AuthModule, ModerationModule, PushModule, TopicsModule],
  controllers: [AdminUsersController, AdminMetricsController, AdminTopicsController],
  providers: [
    AdminUsersRepository,
    AdminMetricsRepository,
    AdminUsersService,
    AdminMetricsService,
    AdminTopicsService,
  ],
})
export class AdminModule {}
