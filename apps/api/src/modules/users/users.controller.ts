import { Body, Controller, Get, Param, Patch } from "@nestjs/common"
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type { PrivateProfile, PublicProfile } from "@ponto/types"
import {
  handleSchema,
  privateProfileSchema,
  publicProfileSchema,
  updateProfileInputSchema,
} from "@ponto/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "../../common/auth/auth-context.js"
import { Public } from "../../common/auth/public.decorator.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "../../common/openapi/swagger.js"
import { ZodValidationPipe } from "../../common/validation/zod-validation.pipe.js"
import { toPrivateProfile, toPublicProfile } from "./user.js"
import { UsersService } from "./users.service.js"

@ApiTags("users")
@ApiStandardErrors()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Profile of the authenticated user" })
  @ApiOkResponse({ schema: toOpenApiSchema(privateProfileSchema) })
  async getMe(@CurrentAuth() auth: AuthContext): Promise<PrivateProfile> {
    return toPrivateProfile(await this.usersService.getById(auth.userId))
  }

  @Patch("me")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Update the authenticated user's profile" })
  @ApiZodBody(updateProfileInputSchema)
  @ApiOkResponse({ schema: toOpenApiSchema(privateProfileSchema) })
  async updateMe(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(updateProfileInputSchema))
    body: z.output<typeof updateProfileInputSchema>,
  ): Promise<PrivateProfile> {
    return toPrivateProfile(await this.usersService.updateProfile(auth.userId, body))
  }

  @Public()
  @Get(":handle")
  @ApiOperation({ summary: "Public profile by handle" })
  @ApiOkResponse({ schema: toOpenApiSchema(publicProfileSchema) })
  async getByHandle(
    @Param("handle", new ZodValidationPipe(handleSchema)) handle: string,
  ): Promise<PublicProfile> {
    return toPublicProfile(await this.usersService.getByHandle(handle))
  }
}
