import { Module } from "@nestjs/common"

import { FollowsModule } from "#src/modules/follows/follows.module.js"
import { RelationsController } from "#src/modules/relations/controllers/relations.controller.js"
import { RelationsService } from "#src/modules/relations/services/relations.service.js"
import { UsersModule } from "#src/modules/users/users.module.js"

// Blocking and muting. The checks every module applies live in UserRelationsService
// (users module), so they are available without importing this module.
@Module({
  imports: [UsersModule, FollowsModule],
  controllers: [RelationsController],
  providers: [RelationsService],
})
export class RelationsModule {}
