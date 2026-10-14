import { Module } from "@nestjs/common"

import { FollowsModule } from "#src/modules/follows/follows.module.js"
import { RealtimeController } from "#src/modules/realtime/controllers/realtime.controller.js"
import { RealtimeService } from "#src/modules/realtime/services/realtime.service.js"
import { UsersModule } from "#src/modules/users/users.module.js"

@Module({
  imports: [FollowsModule, UsersModule],
  controllers: [RealtimeController],
  providers: [RealtimeService],
})
export class RealtimeModule {}
