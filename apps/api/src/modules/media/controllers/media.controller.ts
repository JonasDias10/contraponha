import { Body, Controller, Post } from "@nestjs/common"
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type { MediaUploadTicket } from "@contraponha/types"
import { createMediaUploadInputSchema, mediaUploadTicketSchema } from "@contraponha/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { MediaService } from "#src/modules/media/services/media.service.js"

@ApiTags("media")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post("uploads")
  @ApiOperation({
    summary: "Request a signed URL to upload an image",
    description:
      "Upload the file with a PUT to uploadUrl, sending the returned headers. The URL only accepts the declared type and exact size. Then reference mediaId when creating a post.",
  })
  @ApiZodBody(createMediaUploadInputSchema)
  @ApiCreatedResponse({ schema: toOpenApiSchema(mediaUploadTicketSchema) })
  createUpload(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createMediaUploadInputSchema))
    body: z.output<typeof createMediaUploadInputSchema>,
  ): Promise<MediaUploadTicket> {
    return this.mediaService.createUpload({ ownerId: auth.userId, ...body })
  }
}
