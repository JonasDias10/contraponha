import { Module } from "@nestjs/common"

import { MediaModule } from "#src/modules/media/media.module.js"
import { UsersController } from "#src/modules/users/controllers/users.controller.js"
import { ConsentsRepository } from "#src/modules/users/repositories/consents.repository.js"
import { UsersRepository } from "#src/modules/users/repositories/users.repository.js"
import { RoleGuard } from "#src/modules/users/guards/role.guard.js"
import { SuspensionsRepository } from "#src/modules/users/repositories/suspensions.repository.js"
import { UserRelationsRepository } from "#src/modules/users/repositories/user-relations.repository.js"
import { UserRelationsService } from "#src/modules/users/services/user-relations.service.js"
import { ProfilePhotoService } from "#src/modules/users/services/profile-photo.service.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

@Module({
  imports: [MediaModule],
  controllers: [UsersController],
  providers: [
    UsersRepository,
    ConsentsRepository,
    SuspensionsRepository,
    UserRelationsRepository,
    UserRelationsService,
    UsersService,
    ProfilePhotoService,
    RoleGuard,
  ],
  exports: [
    UsersService,
    ProfilePhotoService,
    SuspensionsRepository,
    UserRelationsRepository,
    UserRelationsService,
    RoleGuard,
  ],
})
export class UsersModule {}
