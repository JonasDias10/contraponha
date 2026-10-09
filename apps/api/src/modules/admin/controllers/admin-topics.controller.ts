import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import { UserRole, type AdminTopic, type Page } from "@contraponha/types"
import {
  adminTopicListQuerySchema,
  adminTopicPageSchema,
  adminTopicSchema,
  createTopicInputSchema,
  topicSlugSchema,
  updateTopicInputSchema,
} from "@contraponha/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import { RequireRole } from "#src/common/auth/require-role.decorator.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { AdminTopicsService } from "#src/modules/admin/services/admin-topics.service.js"
import { TopicsService } from "#src/modules/topics/services/topics.service.js"
import { RoleGuard } from "#src/modules/users/guards/role.guard.js"

@ApiTags("admin")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@UseGuards(RoleGuard)
@RequireRole(UserRole.ADMIN)
@Controller("admin/topics")
export class AdminTopicsController {
  constructor(
    private readonly topicsService: TopicsService,
    private readonly adminTopics: AdminTopicsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Every topic, newest first, optionally only curated ones" })
  @ApiOkResponse({ schema: toOpenApiSchema(adminTopicPageSchema) })
  list(
    @Query(new ZodValidationPipe(adminTopicListQuerySchema))
    query: z.output<typeof adminTopicListQuerySchema>,
  ): Promise<Page<AdminTopic>> {
    return this.topicsService.listAll(query)
  }

  @Post()
  @ApiOperation({ summary: "Create a topic; curated topics are offered during onboarding" })
  @ApiZodBody(createTopicInputSchema)
  @ApiCreatedResponse({ schema: toOpenApiSchema(adminTopicSchema) })
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createTopicInputSchema))
    body: z.output<typeof createTopicInputSchema>,
  ): Promise<AdminTopic> {
    return this.adminTopics.create({ actorId: auth.userId, data: body })
  }

  @Patch(":slug")
  @ApiOperation({ summary: "Rename a topic or change whether it is curated" })
  @ApiZodBody(updateTopicInputSchema)
  @ApiOkResponse({ schema: toOpenApiSchema(adminTopicSchema) })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("slug", new ZodValidationPipe(topicSlugSchema)) slug: string,
    @Body(new ZodValidationPipe(updateTopicInputSchema))
    body: z.output<typeof updateTopicInputSchema>,
  ): Promise<AdminTopic> {
    return this.adminTopics.update({ actorId: auth.userId, slug, data: body })
  }
}
