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

    if (!auth)
      throw new Error("CurrentAuth used on a route that is not protected by the session guard")

    return auth
  },
)

// On public routes the guard still attaches the session when a valid token is sent, so
// responses can include the viewer's state (reactions, bookmarks, follows).
export const CurrentViewer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext | undefined => {
    const { auth } = context.switchToHttp().getRequest<AuthenticatedRequest>()

    return auth
  },
)
