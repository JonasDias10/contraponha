import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import type { FollowStatus, Page, PublicProfile } from "@contraponha/types"
import {
  followStatusSchema,
  handleSchema,
  paginationQuerySchema,
  profilePageSchema,
} from "@contraponha/validation"
import type { z } from "zod"

import { Write } from "#src/common/auth/write-action.decorator.js"
import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import { Public } from "#src/common/auth/public.decorator.js"
import {
  ApiStandardErrors,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { FollowsService } from "#src/modules/follows/services/follows.service.js"
import { WriteAction } from "#src/modules/users/domain/write-limits.js"
import { WriteGuard } from "#src/modules/users/guards/write.guard.js"

const handlePipe = new ZodValidationPipe(handleSchema)
const paginationPipe = new ZodValidationPipe(paginationQuerySchema)

@ApiTags("follows")
@ApiStandardErrors()
@Controller("users/:handle")
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Put("follow")
  @UseGuards(WriteGuard)
  @Write(WriteAction.FOLLOW)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Follow a user (idempotent)" })
  @ApiNoContentResponse()
  follow(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
  ): Promise<void> {
    return this.followsService.follow({ followerId: auth.userId, handle })
  }

  @Delete("follow")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Unfollow a user (idempotent)" })
  @ApiNoContentResponse()
  unfollow(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
  ): Promise<void> {
    return this.followsService.unfollow({ followerId: auth.userId, handle })
  }

  @Get("follow")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Whether the authenticated user follows this user" })
  @ApiOkResponse({ schema: toOpenApiSchema(followStatusSchema) })
  getStatus(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
  ): Promise<FollowStatus> {
    return this.followsService.getStatus({ followerId: auth.userId, handle })
  }

  @Public()
  @Get("followers")
  @ApiOperation({ summary: "Who follows this user, most recent first" })
  @ApiOkResponse({ schema: toOpenApiSchema(profilePageSchema) })
  listFollowers(
    @Param("handle", handlePipe) handle: string,
    @Query(paginationPipe) query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<PublicProfile>> {
    return this.followsService.listFollowers({ handle, cursor: query.cursor, limit: query.limit })
  }

  @Public()
  @Get("following")
  @ApiOperation({ summary: "Who this user follows, most recent first" })
  @ApiOkResponse({ schema: toOpenApiSchema(profilePageSchema) })
  listFollowing(
    @Param("handle", handlePipe) handle: string,
    @Query(paginationPipe) query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<PublicProfile>> {
    return this.followsService.listFollowing({ handle, cursor: query.cursor, limit: query.limit })
  }
}
