import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import type { ContentRevisionList, PostView } from "@ponto/types"
import {
  contentRevisionListSchema,
  createPostInputSchema,
  postViewSchema,
  updatePostInputSchema,
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
import { UuidParam } from "#src/common/validation/uuid-param.decorator.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"

@ApiTags("posts")
@ApiStandardErrors()
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Publish a post" })
  @ApiZodBody(createPostInputSchema)
  @ApiCreatedResponse({ schema: toOpenApiSchema(postViewSchema) })
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createPostInputSchema))
    body: z.output<typeof createPostInputSchema>,
  ): Promise<PostView> {
    return this.postsService.create({
      authorId: auth.userId,
      body: body.body,
      mediaIds: body.mediaIds ?? [],
    })
  }

  @Public()
  @Get(":postId")
  @ApiOperation({ summary: "Read a post; removed posts come back as a marker" })
  @ApiOkResponse({ schema: toOpenApiSchema(postViewSchema) })
  get(@UuidParam("postId") postId: string): Promise<PostView> {
    return this.postsService.getView(postId)
  }

  @Patch(":postId")
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Edit a post during its edit window (author only)" })
  @ApiZodBody(updatePostInputSchema)
  @ApiOkResponse({ schema: toOpenApiSchema(postViewSchema) })
  update(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("postId") postId: string,
    @Body(new ZodValidationPipe(updatePostInputSchema))
    body: z.output<typeof updatePostInputSchema>,
  ): Promise<PostView> {
    return this.postsService.update({ postId, userId: auth.userId, body: body.body })
  }

  @Delete(":postId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Remove a post (author only); its content and history are erased" })
  @ApiNoContentResponse()
  delete(@CurrentAuth() auth: AuthContext, @UuidParam("postId") postId: string): Promise<void> {
    return this.postsService.delete({ postId, userId: auth.userId })
  }

  @Public()
  @Get(":postId/revisions")
  @ApiOperation({ summary: "Previous versions of an edited post, newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(contentRevisionListSchema) })
  listRevisions(@UuidParam("postId") postId: string): Promise<ContentRevisionList> {
    return this.postsService.listRevisions(postId)
  }
}
