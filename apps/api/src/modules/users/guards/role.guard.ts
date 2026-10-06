import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { ApiErrorCode, type UserRole } from "@ponto/types"

import type { AuthenticatedRequest } from "#src/common/auth/auth-context.js"
import { REQUIRED_ROLE_KEY } from "#src/common/auth/require-role.decorator.js"
import { AppError } from "#src/common/errors/app-error.js"
import { hasRole } from "#src/modules/users/domain/roles.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

// Applied with @UseGuards on the routes that need it, after the global session guard,
// so the role lookup costs one query only on privileged routes.
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<UserRole | undefined>(REQUIRED_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!required) return true

    const { auth } = context.switchToHttp().getRequest<AuthenticatedRequest>()

    if (!auth) throw new AppError(ApiErrorCode.UNAUTHORIZED)

    const user = await this.usersService.getById(auth.userId)

    if (!hasRole({ role: user.role, required })) throw new AppError(ApiErrorCode.FORBIDDEN)

    return true
  }
}
