import { Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import type { NotificationView, Page, UnreadNotificationCount } from "@ponto/types"
import {
  notificationPageSchema,
  paginationQuerySchema,
  unreadNotificationCountSchema,
} from "@ponto/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import {
  ApiStandardErrors,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { UuidParam } from "#src/common/validation/uuid-param.decorator.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { NotificationsService } from "#src/modules/notifications/services/notifications.service.js"

@ApiTags("notifications")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "The authenticated user's notifications, newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(notificationPageSchema) })
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<NotificationView>> {
    return this.notificationsService.list({
      userId: auth.userId,
      cursor: query.cursor,
      limit: query.limit,
    })
  }

  @Get("unread-count")
  @ApiOperation({ summary: "How many notifications are unread" })
  @ApiOkResponse({ schema: toOpenApiSchema(unreadNotificationCountSchema) })
  countUnread(@CurrentAuth() auth: AuthContext): Promise<UnreadNotificationCount> {
    return this.notificationsService.countUnread(auth.userId)
  }

  @Post("read-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mark every notification as read" })
  @ApiNoContentResponse()
  markAllRead(@CurrentAuth() auth: AuthContext): Promise<void> {
    return this.notificationsService.markAllRead(auth.userId)
  }

  @Post(":notificationId/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mark one notification as read (idempotent)" })
  @ApiNoContentResponse()
  markRead(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("notificationId") notificationId: string,
  ): Promise<void> {
    return this.notificationsService.markRead({ userId: auth.userId, notificationId })
  }
}
