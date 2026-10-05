import { Module } from "@nestjs/common"

import { UsersModule } from "../users/users.module.js"
import { AccountVerificationService } from "./account-verification.service.js"
import { AuthController } from "./auth.controller.js"
import { AuthService } from "./auth.service.js"
import { CredentialsRepository } from "./credentials.repository.js"
import { PasswordHasher } from "./password-hasher.js"
import { SessionAuthGuard } from "./session-auth.guard.js"
import { SessionCache } from "./session-cache.js"
import { SessionsController } from "./sessions.controller.js"
import { SessionsRepository } from "./sessions.repository.js"
import { SessionsService } from "./sessions.service.js"
import { VerificationTokensRepository } from "./verification-tokens.repository.js"

@Module({
  imports: [UsersModule],
  controllers: [AuthController, SessionsController],
  providers: [
    AccountVerificationService,
    AuthService,
    CredentialsRepository,
    PasswordHasher,
    SessionAuthGuard,
    SessionCache,
    SessionsRepository,
    SessionsService,
    VerificationTokensRepository,
  ],
  exports: [SessionAuthGuard],
})
export class AuthModule {}
