import { Module } from "@nestjs/common"

import { UsersController } from "#src/modules/users/controllers/users.controller.js"
import { UsersRepository } from "#src/modules/users/repositories/users.repository.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

@Module({
  controllers: [UsersController],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
