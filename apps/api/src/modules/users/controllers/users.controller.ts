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

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import { Public } from "#src/common/auth/public.decorator.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { toPrivateProfile, toPublicProfile } from "#src/modules/users/domain/user.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

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
    const user = await this.usersService.getById(auth.userId)
    return toPrivateProfile(user)
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
    const user = await this.usersService.updateProfile({ id: auth.userId, data: body })
    return toPrivateProfile(user)
  }

  @Public()
  @Get(":handle")
  @ApiOperation({ summary: "Public profile by handle" })
  @ApiOkResponse({ schema: toOpenApiSchema(publicProfileSchema) })
  async getByHandle(
    @Param("handle", new ZodValidationPipe(handleSchema)) handle: string,
  ): Promise<PublicProfile> {
    const user = await this.usersService.getByHandle(handle)
    return toPublicProfile(user)
  }
}
