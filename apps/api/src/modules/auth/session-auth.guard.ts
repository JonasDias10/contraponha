import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { ApiErrorCode } from "@ponto/types"

import type { AuthenticatedRequest } from "#src/common/auth/auth-context.js"
import { IS_PUBLIC_KEY } from "#src/common/auth/public.decorator.js"
import { AppError } from "#src/common/errors/app-error.js"
import { SessionsService } from "./sessions.service.js"

const BEARER_PREFIX = "bearer "

function extractBearerToken(request: AuthenticatedRequest): string | undefined {
  const header = request.headers.authorization

  if (!header?.toLowerCase().startsWith(BEARER_PREFIX)) {
    return undefined
  }

  return header.slice(BEARER_PREFIX.length).trim() || undefined
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionsService: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = extractBearerToken(request)
    const auth = token ? await this.sessionsService.authenticate(token) : undefined

    if (!auth) {
      throw new AppError(ApiErrorCode.UNAUTHORIZED)
    }

    request.auth = auth
    return true
  }
}
