import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import {
  UserRole,
  type AdminUserDetail,
  type AdminUserSummary,
  type Page,
} from "@contraponha/types"
import {
  adminUserDetailSchema,
  adminUserListQuerySchema,
  adminUserPageSchema,
  grantVerificationInputSchema,
  handleSchema,
  suspendUserInputSchema,
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
import { AdminUsersService } from "#src/modules/admin/services/admin-users.service.js"
import { RoleGuard } from "#src/modules/users/guards/role.guard.js"

const handlePipe = new ZodValidationPipe(handleSchema)

@ApiTags("admin")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@UseGuards(RoleGuard)
@RequireRole(UserRole.MODERATOR)
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: "Search accounts by name, @ or email, with role and status filters" })
  @ApiOkResponse({ schema: toOpenApiSchema(adminUserPageSchema) })
  list(
    @Query(new ZodValidationPipe(adminUserListQuerySchema))
    query: z.output<typeof adminUserListQuerySchema>,
  ): Promise<Page<AdminUserSummary>> {
    return this.adminUsers.list(query)
  }

  @Get(":handle")
  @ApiOperation({ summary: "Account details, suspension history and report counts" })
  @ApiOkResponse({ schema: toOpenApiSchema(adminUserDetailSchema) })
  detail(@Param("handle", handlePipe) handle: string): Promise<AdminUserDetail> {
    return this.adminUsers.detail(handle)
  }

  @Post(":handle/suspensions")
  @ApiOperation({
    summary: "Suspend an account until a date, or ban it when endsAt is omitted",
    description: "Ends every session. Only people with a lower role can be suspended.",
  })
  @ApiZodBody(suspendUserInputSchema)
  @ApiCreatedResponse({ schema: toOpenApiSchema(adminUserDetailSchema) })
  suspend(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
    @Body(new ZodValidationPipe(suspendUserInputSchema))
    body: z.output<typeof suspendUserInputSchema>,
  ): Promise<AdminUserDetail> {
    return this.adminUsers.suspend({ handle, actorId: auth.userId, ...body })
  }

  @Delete(":handle/suspension")
  @ApiOperation({ summary: "Lift the running suspension or ban" })
  @ApiOkResponse({ schema: toOpenApiSchema(adminUserDetailSchema) })
  lift(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
  ): Promise<AdminUserDetail> {
    return this.adminUsers.lift({ handle, actorId: auth.userId })
  }

  @Delete(":handle/avatar")
  @ApiOperation({ summary: "Remove a profile photo that breaks the guidelines" })
  @ApiOkResponse({ schema: toOpenApiSchema(adminUserDetailSchema) })
  removeAvatar(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
  ): Promise<AdminUserDetail> {
    return this.adminUsers.removeAvatar({ handle, actorId: auth.userId })
  }

  @Put(":handle/verification")
  @RequireRole(UserRole.ADMIN)
  @ApiOperation({
    summary: "Grant the verified badge, or change its category",
    description:
      "Admins only. The note says how the identity was checked and goes to the audit log.",
  })
  @ApiZodBody(grantVerificationInputSchema)
  @ApiOkResponse({ schema: toOpenApiSchema(adminUserDetailSchema) })
  grantVerification(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
    @Body(new ZodValidationPipe(grantVerificationInputSchema))
    body: z.output<typeof grantVerificationInputSchema>,
  ): Promise<AdminUserDetail> {
    return this.adminUsers.grantVerification({ handle, actorId: auth.userId, ...body })
  }

  @Delete(":handle/verification")
  @RequireRole(UserRole.ADMIN)
  @ApiOperation({ summary: "Remove the verified badge. Admins only." })
  @ApiOkResponse({ schema: toOpenApiSchema(adminUserDetailSchema) })
  revokeVerification(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
  ): Promise<AdminUserDetail> {
    return this.adminUsers.revokeVerification({ handle, actorId: auth.userId })
  }
}
