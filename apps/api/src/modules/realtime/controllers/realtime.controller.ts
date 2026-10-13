import { Controller, Header, Sse, type MessageEvent } from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger"
import type { Observable } from "rxjs"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import { ApiStandardErrors, SESSION_SECURITY_SCHEME } from "#src/common/openapi/swagger.js"
import { UuidParam } from "#src/common/validation/uuid-param.decorator.js"
import { RealtimeService } from "#src/modules/realtime/services/realtime.service.js"

const SSE_DESCRIPTION =
  "Server-Sent Events. Each event has a type and a JSON body (RealtimeEvent). A heartbeat event arrives every 25 s."

@ApiTags("realtime")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller()
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  @Sse("events")
  @Header("x-accel-buffering", "no")
  @ApiOperation({
    summary: "Live notifications and new posts from people you follow",
    description: SSE_DESCRIPTION,
  })
  @ApiProduces("text/event-stream")
  events(@CurrentAuth() auth: AuthContext): Observable<MessageEvent> {
    return this.realtime.streamFor(auth.userId)
  }

  @Sse("posts/:postId/events")
  @Header("x-accel-buffering", "no")
  @ApiOperation({ summary: "Live new contributions on a post", description: SSE_DESCRIPTION })
  @ApiProduces("text/event-stream")
  postEvents(
    @CurrentAuth() auth: AuthContext,
    @UuidParam("postId") postId: string,
  ): Observable<MessageEvent> {
    return this.realtime.streamForPost({ postId, viewerId: auth.userId })
  }
}
