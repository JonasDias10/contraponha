import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import { UserRole, type ModerationActionView, type Page, type ReportView } from "@ponto/types"
import {
  changeRoleInputSchema,
  handleSchema,
  moderationActionPageSchema,
  paginationQuerySchema,
  removeContentInputSchema,
  reportListQuerySchema,
  reportPageSchema,
  resolveReportInputSchema,
} from "@ponto/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import { RequireRole } from "#src/common/auth/require-role.decorator.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { UuidParam } from "#src/common/validation/uuid-param.decorator.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { ModerationService } from "#src/modules/moderation/services/moderation.service.js"
import { RoleGuard } from "#src/modules/users/guards/role.guard.js"

const removeContentPipe = new ZodValidationPipe(removeContentInputSchema)

@ApiTags("moderation")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@UseGuards(RoleGuard)
@RequireRole(UserRole.MODERATOR)
@Controller("moderation")
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get("reports")
  @ApiOperation({ summary: "Reports by status (open by default), newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(reportPageSchema) })
  listReports(
    @Query(new ZodValidationPipe(reportListQuerySchema))
    query: z.output<typeof reportListQuerySchema>,
  ): Promise<Page<ReportView>> {
    return this.moderationService.listReports(query)
  }

  @Post("reports/:reportId/resolve")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Resolve a report by removing the content or dismissing it" })
  @ApiZodBody(resolveReportInputSchema)
  @ApiNoContentResponse()
  resolveReport(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("reportId") reportId: string,
    @Body(new ZodValidationPipe(resolveReportInputSchema))
    body: z.output<typeof resolveReportInputSchema>,
  ): Promise<void> {
    return this.moderationService.resolveReport({
      reportId,
      moderatorId: auth.userId,
      resolution: body.resolution,
      note: body.note,
    })
  }

  @Post("posts/:postId/remove")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a post; it shows as removed by moderation" })
  @ApiZodBody(removeContentInputSchema)
  @ApiNoContentResponse()
  removePost(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("postId") postId: string,
    @Body(removeContentPipe) body: z.output<typeof removeContentInputSchema>,
  ): Promise<void> {
    return this.moderationService.removePost({
      targetId: postId,
      moderatorId: auth.userId,
      note: body.note,
    })
  }

  @Post("comments/:commentId/remove")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a comment; it shows as removed by moderation" })
  @ApiZodBody(removeContentInputSchema)
  @ApiNoContentResponse()
  removeComment(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("commentId") commentId: string,
    @Body(removeContentPipe) body: z.output<typeof removeContentInputSchema>,
  ): Promise<void> {
    return this.moderationService.removeComment({
      targetId: commentId,
      moderatorId: auth.userId,
      note: body.note,
    })
  }

  @Get("actions")
  @ApiOperation({ summary: "Audit trail of moderation actions, newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(moderationActionPageSchema) })
  listActions(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<ModerationActionView>> {
    return this.moderationService.listActions(query)
  }

  @RequireRole(UserRole.ADMIN)
  @Put("users/:handle/role")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change a user's role (admins only)" })
  @ApiZodBody(changeRoleInputSchema)
  @ApiNoContentResponse()
  changeRole(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", new ZodValidationPipe(handleSchema)) handle: string,
    @Body(new ZodValidationPipe(changeRoleInputSchema))
    body: z.output<typeof changeRoleInputSchema>,
  ): Promise<void> {
    return this.moderationService.changeRole({ handle, role: body.role, adminId: auth.userId })
  }
}
