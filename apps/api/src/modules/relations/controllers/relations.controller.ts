import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Query } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import type { Page, PublicProfile } from "@contraponha/types"
import { handleSchema, paginationQuerySchema, profilePageSchema } from "@contraponha/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import {
  ApiStandardErrors,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { RelationsService } from "#src/modules/relations/services/relations.service.js"

const handlePipe = new ZodValidationPipe(handleSchema)
const paginationPipe = new ZodValidationPipe(paginationQuerySchema)

@ApiTags("relations")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller()
export class RelationsController {
  constructor(private readonly relations: RelationsService) {}

  @Put("users/:handle/block")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Block a person (idempotent)",
    description: "Ends follows both ways; neither person sees or reaches the other.",
  })
  @ApiNoContentResponse()
  block(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
  ): Promise<void> {
    return this.relations.block({ actorId: auth.userId, handle })
  }

  @Delete("users/:handle/block")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Unblock a person (idempotent)" })
  @ApiNoContentResponse()
  unblock(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
  ): Promise<void> {
    return this.relations.unblock({ actorId: auth.userId, handle })
  }

  @Put("users/:handle/mute")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Mute a person (idempotent)",
    description: "Hides their posts, contributions and notifications from you. They are not told.",
  })
  @ApiNoContentResponse()
  mute(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
  ): Promise<void> {
    return this.relations.mute({ actorId: auth.userId, handle })
  }

  @Delete("users/:handle/mute")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Unmute a person (idempotent)" })
  @ApiNoContentResponse()
  unmute(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
  ): Promise<void> {
    return this.relations.unmute({ actorId: auth.userId, handle })
  }

  @Get("me/blocks")
  @ApiOperation({ summary: "People you blocked, most recent first" })
  @ApiOkResponse({ schema: toOpenApiSchema(profilePageSchema) })
  listBlocked(
    @CurrentAuth() auth: AuthContext,
    @Query(paginationPipe) query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<PublicProfile>> {
    return this.relations.listBlocked({ userId: auth.userId, ...query })
  }

  @Get("me/mutes")
  @ApiOperation({ summary: "People you muted, most recent first" })
  @ApiOkResponse({ schema: toOpenApiSchema(profilePageSchema) })
  listMuted(
    @CurrentAuth() auth: AuthContext,
    @Query(paginationPipe) query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<PublicProfile>> {
    return this.relations.listMuted({ userId: auth.userId, ...query })
  }
}
