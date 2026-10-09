import { Body, Controller, Delete, Get, Patch, Post, Put } from "@nestjs/common"
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type { PrivateProfile } from "@contraponha/types"
import {
  privateProfileSchema,
  setAvatarInputSchema,
  updateProfileInputSchema,
} from "@contraponha/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { toPrivateProfile } from "#src/modules/users/domain/user.js"
import { ProfilePhotoService } from "#src/modules/users/services/profile-photo.service.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

@ApiTags("users")
@ApiStandardErrors()
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly profilePhotoService: ProfilePhotoService,
  ) {}

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

  @Put("me/avatar")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({
    summary: "Use an uploaded image as the profile photo",
    description:
      "Request the upload with purpose avatar, PUT the file, then send its mediaId here. The previous photo is deleted.",
  })
  @ApiZodBody(setAvatarInputSchema)
  @ApiOkResponse({ schema: toOpenApiSchema(privateProfileSchema) })
  async setAvatar(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(setAvatarInputSchema)) body: z.output<typeof setAvatarInputSchema>,
  ): Promise<PrivateProfile> {
    const user = await this.profilePhotoService.set({ userId: auth.userId, mediaId: body.mediaId })

    return toPrivateProfile(user)
  }

  @Delete("me/avatar")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Remove the profile photo" })
  @ApiOkResponse({ schema: toOpenApiSchema(privateProfileSchema) })
  async removeAvatar(@CurrentAuth() auth: AuthContext): Promise<PrivateProfile> {
    const user = await this.profilePhotoService.remove(auth.userId)

    return toPrivateProfile(user)
  }

  @Post("me/onboarding")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Mark onboarding (interests and people to follow) as done" })
  @ApiOkResponse({ schema: toOpenApiSchema(privateProfileSchema) })
  async completeOnboarding(@CurrentAuth() auth: AuthContext): Promise<PrivateProfile> {
    const user = await this.usersService.markOnboarded(auth.userId)
    return toPrivateProfile(user)
  }
}
