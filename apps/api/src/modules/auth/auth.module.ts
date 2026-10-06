import { Module } from "@nestjs/common"

import { UsersModule } from "#src/modules/users/users.module.js"
import { AccountVerificationService } from "#src/modules/auth/services/account-verification.service.js"
import { AuthController } from "#src/modules/auth/controllers/auth.controller.js"
import { AuthService } from "#src/modules/auth/services/auth.service.js"
import { CredentialsRepository } from "#src/modules/auth/repositories/credentials.repository.js"
import { PasswordHasher } from "#src/modules/auth/infrastructure/password-hasher.js"
import { SessionAuthGuard } from "#src/modules/auth/guards/session-auth.guard.js"
import { SessionCache } from "#src/modules/auth/infrastructure/session-cache.js"
import { SessionsController } from "#src/modules/auth/controllers/sessions.controller.js"
import { SessionsRepository } from "#src/modules/auth/repositories/sessions.repository.js"
import { SessionsService } from "#src/modules/auth/services/sessions.service.js"
import { VerificationTokensRepository } from "#src/modules/auth/repositories/verification-tokens.repository.js"

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
  exports: [SessionAuthGuard, AuthService, AccountVerificationService, SessionsService],
})
export class AuthModule {}
