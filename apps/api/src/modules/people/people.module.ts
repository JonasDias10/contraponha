import { Module } from "@nestjs/common"

import { PeopleController } from "#src/modules/people/controllers/people.controller.js"
import { PeopleRepository } from "#src/modules/people/repositories/people.repository.js"
import { PeopleService } from "#src/modules/people/services/people.service.js"
import { UsersModule } from "#src/modules/users/users.module.js"

@Module({
  imports: [UsersModule],
  controllers: [PeopleController],
  providers: [PeopleRepository, PeopleService],
})
export class PeopleModule {}
