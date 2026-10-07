import { SetMetadata } from "@nestjs/common"
import type { UserRole } from "@contraponha/types"

export const REQUIRED_ROLE_KEY = "auth:requiredRole"

export const RequireRole = (role: UserRole): ClassDecorator & MethodDecorator =>
  SetMetadata(REQUIRED_ROLE_KEY, role)
