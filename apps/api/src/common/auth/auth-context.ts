import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import type { Request } from "express"

export interface AuthContext {
  userId: string
  sessionId: string
}

export type AuthenticatedRequest = Request & { auth?: AuthContext }

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext => {
    const { auth } = context.switchToHttp().getRequest<AuthenticatedRequest>()

    if (!auth) {
      throw new Error("CurrentAuth used on a route that is not protected by the session guard")
    }

    return auth
  },
)
