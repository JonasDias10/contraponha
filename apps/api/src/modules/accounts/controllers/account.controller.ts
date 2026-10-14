import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import type {
  AccountDeletionStatus,
  DataExportDownload,
  DataExportList,
  DataExportView,
} from "@contraponha/types"
import {
  accountDeletionStatusSchema,
  dataExportDownloadSchema,
  dataExportListSchema,
  dataExportViewSchema,
  requestDataExportInputSchema,
  scheduleAccountDeletionInputSchema,
} from "@contraponha/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { SensitiveRateLimit } from "#src/common/rate-limit/rate-limit.js"
import { UuidParam } from "#src/common/validation/uuid-param.decorator.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { AccountDeletionService } from "#src/modules/accounts/services/account-deletion.service.js"
import { DataExportsService } from "#src/modules/accounts/services/data-exports.service.js"
import { TopicsService } from "#src/modules/topics/services/topics.service.js"

// The rights of LGPD art. 18, exercised without writing to anyone: access and portability
// (exports), deletion, and resetting what personalizes recommendations.
@ApiTags("account")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller("me")
export class AccountController {
  constructor(
    private readonly dataExports: DataExportsService,
    private readonly accountDeletion: AccountDeletionService,
    private readonly topicsService: TopicsService,
  ) {}

  @SensitiveRateLimit()
  @Post("data-exports")
  @ApiOperation({ summary: "Ask for a copy of your data; an email arrives when it is ready" })
  @ApiZodBody(requestDataExportInputSchema)
  @ApiCreatedResponse({ schema: toOpenApiSchema(dataExportViewSchema) })
  requestExport(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(requestDataExportInputSchema))
    body: z.output<typeof requestDataExportInputSchema>,
  ): Promise<DataExportView> {
    return this.dataExports.request({ userId: auth.userId, ...body })
  }

  @Get("data-exports")
  @ApiOperation({ summary: "Your recent data exports" })
  @ApiOkResponse({ schema: toOpenApiSchema(dataExportListSchema) })
  listExports(@CurrentAuth() auth: AuthContext): Promise<DataExportList> {
    return this.dataExports.list(auth.userId)
  }

  @Get("data-exports/:exportId/download")
  @ApiOperation({ summary: "A short-lived link to download a ready export" })
  @ApiOkResponse({ schema: toOpenApiSchema(dataExportDownloadSchema) })
  download(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("exportId") exportId: string,
  ): Promise<DataExportDownload> {
    return this.dataExports.download({ userId: auth.userId, exportId })
  }

  @SensitiveRateLimit()
  @Put("deletion")
  @ApiOperation({
    summary: "Schedule account deletion in 30 days and sign out everywhere",
    description:
      "Signing in again before the date cancels the deletion, and the account owner gets an email saying so.",
  })
  @ApiZodBody(scheduleAccountDeletionInputSchema)
  @ApiOkResponse({ schema: toOpenApiSchema(accountDeletionStatusSchema) })
  scheduleDeletion(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(scheduleAccountDeletionInputSchema))
    body: z.output<typeof scheduleAccountDeletionInputSchema>,
  ): Promise<AccountDeletionStatus> {
    return this.accountDeletion.schedule({ userId: auth.userId, ...body })
  }

  @Post("recommendations/reset")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Forget the topics that personalize Discover" })
  @ApiNoContentResponse()
  resetRecommendations(@CurrentAuth() auth: AuthContext): Promise<void> {
    return this.topicsService.unfollowAll({ userId: auth.userId })
  }
}
