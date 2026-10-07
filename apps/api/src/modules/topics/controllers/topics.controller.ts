import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import type { TopicList, TopicView } from "@contraponha/types"
import {
  followTopicsInputSchema,
  topicListSchema,
  topicSlugSchema,
  topicViewSchema,
} from "@contraponha/validation"
import type { z } from "zod"

import { CurrentAuth, CurrentViewer, type AuthContext } from "#src/common/auth/auth-context.js"
import { Public } from "#src/common/auth/public.decorator.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { TopicsService } from "#src/modules/topics/services/topics.service.js"

const slugPipe = new ZodValidationPipe(topicSlugSchema)

@ApiTags("topics")
@ApiStandardErrors()
@Controller("topics")
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Curated topics offered as interests" })
  @ApiOkResponse({ schema: toOpenApiSchema(topicListSchema) })
  listCurated(@CurrentViewer() viewer: AuthContext | undefined): Promise<TopicList> {
    return this.topicsService.listCurated(viewer?.userId)
  }

  @Get("followed")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Topics the authenticated user follows" })
  @ApiOkResponse({ schema: toOpenApiSchema(topicListSchema) })
  listFollowed(@CurrentAuth() auth: AuthContext): Promise<TopicList> {
    return this.topicsService.listFollowed(auth.userId)
  }

  @Put("followed")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Follow several topics at once (onboarding)" })
  @ApiZodBody(followTopicsInputSchema)
  @ApiOkResponse({ schema: toOpenApiSchema(topicListSchema) })
  followMany(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(followTopicsInputSchema))
    body: z.output<typeof followTopicsInputSchema>,
  ): Promise<TopicList> {
    return this.topicsService.followMany({ userId: auth.userId, slugs: body.slugs })
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "A topic by slug" })
  @ApiOkResponse({ schema: toOpenApiSchema(topicViewSchema) })
  getBySlug(
    @CurrentViewer() viewer: AuthContext | undefined,
    @Param("slug", slugPipe) slug: string,
  ): Promise<TopicView> {
    return this.topicsService.getBySlug({ slug, viewerId: viewer?.userId })
  }

  @Put(":slug/follow")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Follow a topic (idempotent)" })
  @ApiNoContentResponse()
  follow(@CurrentAuth() auth: AuthContext, @Param("slug", slugPipe) slug: string): Promise<void> {
    return this.topicsService.follow({ userId: auth.userId, slug })
  }

  @Delete(":slug/follow")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Unfollow a topic (idempotent)" })
  @ApiNoContentResponse()
  unfollow(@CurrentAuth() auth: AuthContext, @Param("slug", slugPipe) slug: string): Promise<void> {
    return this.topicsService.unfollow({ userId: auth.userId, slug })
  }
}
