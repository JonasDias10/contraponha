import { Controller, Get, Param } from "@nestjs/common"
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type { FollowedByPreview, ProfileView, SuggestedPeople } from "@ponto/types"
import {
  followedByPreviewSchema,
  handleSchema,
  profileViewSchema,
  suggestedPeopleSchema,
} from "@ponto/validation"

import { CurrentAuth, CurrentViewer, type AuthContext } from "#src/common/auth/auth-context.js"
import { Public } from "#src/common/auth/public.decorator.js"
import {
  ApiStandardErrors,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { PeopleService } from "#src/modules/people/services/people.service.js"

const handlePipe = new ZodValidationPipe(handleSchema)

@ApiTags("people")
@ApiStandardErrors()
@Controller()
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get("people/suggestions")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({
    summary: "People who write well about the reader's topics, by quality reactions received",
  })
  @ApiOkResponse({ schema: toOpenApiSchema(suggestedPeopleSchema) })
  suggestions(@CurrentAuth() auth: AuthContext): Promise<SuggestedPeople> {
    return this.peopleService.suggestions(auth.userId)
  }

  @Public()
  @Get("users/:handle")
  @ApiOperation({
    summary: "Public profile with recognition and the topics the person writes about",
  })
  @ApiOkResponse({ schema: toOpenApiSchema(profileViewSchema) })
  profile(
    @CurrentViewer() viewer: AuthContext | undefined,
    @Param("handle", handlePipe) handle: string,
  ): Promise<ProfileView> {
    return this.peopleService.profile({ handle, viewerId: viewer?.userId })
  }

  @Get("users/:handle/followed-by")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "People you follow who also follow this person" })
  @ApiOkResponse({ schema: toOpenApiSchema(followedByPreviewSchema) })
  followedBy(
    @CurrentAuth() auth: AuthContext,
    @Param("handle", handlePipe) handle: string,
  ): Promise<FollowedByPreview> {
    return this.peopleService.followedBy({ handle, viewerId: auth.userId })
  }
}
