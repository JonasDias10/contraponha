import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger"
import { ReplyPolicy, type ContentRevisionList, type Page, type PostView } from "@contraponha/types"
import {
  contentRevisionListSchema,
  createPostInputSchema,
  paginationQuerySchema,
  postPageSchema,
  postViewSchema,
  updatePostInputSchema,
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
import { UuidParam } from "#src/common/validation/uuid-param.decorator.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"
import { RepostsService } from "#src/modules/posts/services/reposts.service.js"

@ApiTags("posts")
@ApiStandardErrors()
@Controller("posts")
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly repostsService: RepostsService,
  ) {}

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
      title: body.title ?? null,
      body: body.body,
      sources: body.sources ?? [],
      topics: body.topics ?? [],
      replyPolicy: body.replyPolicy ?? ReplyPolicy.EVERYONE,
      mediaIds: body.mediaIds ?? [],
      quotedPostId: body.quotedPostId ?? null,
    })
  }

  @Public()
  @Get(":postId")
  @ApiOperation({ summary: "Read a post; removed posts come back as a marker" })
  @ApiOkResponse({ schema: toOpenApiSchema(postViewSchema) })
  get(
    @CurrentViewer() viewer: AuthContext | undefined,
    @UuidParam("postId") postId: string,
  ): Promise<PostView> {
    return this.postsService.getView({ postId, viewerId: viewer?.userId })
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
    return this.postsService.update({ postId, userId: auth.userId, input: body })
  }

  @Put(":postId/pin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({
    summary: "Pin a post to the top of the author's profile (replaces the previous one)",
  })
  @ApiNoContentResponse()
  pin(@CurrentAuth() auth: AuthContext, @UuidParam("postId") postId: string): Promise<void> {
    return this.postsService.pin({ postId, userId: auth.userId })
  }

  @Delete(":postId/pin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Unpin a post" })
  @ApiNoContentResponse()
  unpin(@CurrentAuth() auth: AuthContext, @UuidParam("postId") postId: string): Promise<void> {
    return this.postsService.unpin({ postId, userId: auth.userId })
  }

  @Delete(":postId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Remove a post (author only); its content and history are erased" })
  @ApiNoContentResponse()
  delete(@CurrentAuth() auth: AuthContext, @UuidParam("postId") postId: string): Promise<void> {
    return this.postsService.delete({ postId, userId: auth.userId })
  }

  @Put(":postId/repost")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Repost to your followers (idempotent)" })
  @ApiNoContentResponse()
  repost(@CurrentAuth() auth: AuthContext, @UuidParam("postId") postId: string): Promise<void> {
    return this.repostsService.repost({ userId: auth.userId, postId })
  }

  @Delete(":postId/repost")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SESSION_SECURITY_SCHEME)
  @ApiOperation({ summary: "Undo a repost (idempotent)" })
  @ApiNoContentResponse()
  unrepost(@CurrentAuth() auth: AuthContext, @UuidParam("postId") postId: string): Promise<void> {
    return this.repostsService.unrepost({ userId: auth.userId, postId })
  }

  @Public()
  @Get(":postId/quotes")
  @ApiOperation({ summary: "Posts that quote this one, newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(postPageSchema) })
  quotes(
    @CurrentViewer() viewer: AuthContext | undefined,
    @UuidParam("postId") postId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: z.output<typeof paginationQuerySchema>,
  ): Promise<Page<PostView>> {
    return this.postsService.listQuotes({ postId, viewerId: viewer?.userId, ...query })
  }

  @Public()
  @Get(":postId/revisions")
  @ApiOperation({ summary: "Previous versions of an edited post, newest first" })
  @ApiOkResponse({ schema: toOpenApiSchema(contentRevisionListSchema) })
  listRevisions(@UuidParam("postId") postId: string): Promise<ContentRevisionList> {
    return this.postsService.listRevisions(postId)
  }
}
