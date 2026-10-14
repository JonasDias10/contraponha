import { SetMetadata } from "@nestjs/common"

import type { WriteAction } from "#src/modules/users/domain/write-limits.js"

export const WRITE_ACTION_KEY = "auth:writeAction"

// Marks a route that publishes or reaches other people; WriteGuard then requires a
// confirmed email and applies the per-account hourly limit.
export const Write = (action: WriteAction): MethodDecorator => SetMetadata(WRITE_ACTION_KEY, action)
