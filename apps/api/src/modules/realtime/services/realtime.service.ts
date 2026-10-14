import { Injectable, type MessageEvent } from "@nestjs/common"
import { RealtimeEventType, type RealtimeEvent } from "@contraponha/types"
import { interval, map, merge, Observable } from "rxjs"

import { RealtimeBus } from "#src/infrastructure/realtime/realtime-bus.js"
import { FollowsService } from "#src/modules/follows/services/follows.service.js"
import { UserRelationsService } from "#src/modules/users/services/user-relations.service.js"

// Proxies and load balancers drop idle connections; a comment line every 25 s keeps it open.
const HEARTBEAT_MS = 25_000
// Who the viewer follows is reloaded this often, so a new follow shows up within a minute.
const FOLLOWING_REFRESH_MS = 60_000

export interface PostStreamParams {
  postId: string
  viewerId: string
}

// Unnamed messages, so EventSource's onmessage receives them all; the type is in the body.
function toMessage(event: RealtimeEvent): MessageEvent {
  return { data: event }
}

@Injectable()
export class RealtimeService {
  constructor(
    private readonly bus: RealtimeBus,
    private readonly followsService: FollowsService,
    private readonly relations: UserRelationsService,
  ) {}

  // The viewer's own stream: notification changes and new posts from people they follow.
  streamFor(userId: string): Observable<MessageEvent> {
    const events = new Observable<RealtimeEvent>((subscriber) => {
      let following = new Set<string>()

      const loadFollowing = (): void => {
        this.followsService
          .listFolloweeIds(userId)
          .then((ids) => {
            following = new Set(ids)
          })
          .catch(() => undefined)
      }

      loadFollowing()

      const refresh = setInterval(loadFollowing, FOLLOWING_REFRESH_MS)

      const offUser = this.bus.onUser({
        key: userId,
        listener: ({ unreadCount }) =>
          subscriber.next({ type: RealtimeEventType.NOTIFICATIONS_CHANGED, unreadCount }),
      })

      const offPosts = this.bus.onAnyPost(({ postId, authorId }) => {
        if (!following.has(authorId)) return

        void this.relations
          .isNotificationAllowed({ recipientId: userId, actorId: authorId })
          .then((isAllowed) => {
            if (isAllowed) subscriber.next({ type: RealtimeEventType.FEED_NEW_POST, postId })
          })
      })

      return () => {
        clearInterval(refresh)

        offUser()

        offPosts()
      }
    })

    return this.withHeartbeat(events)
  }

  // New contributions on one post, for the discussion the viewer has open. Contributions
  // from people the viewer blocked or muted are not announced.
  streamForPost({ postId, viewerId }: PostStreamParams): Observable<MessageEvent> {
    const events = new Observable<RealtimeEvent>((subscriber) =>
      this.bus.onPostComments({
        key: postId,
        listener: ({ commentId, parentId, authorId }) => {
          if (authorId === viewerId) return

          void this.relations
            .isNotificationAllowed({ recipientId: viewerId, actorId: authorId })
            .then((isAllowed) => {
              if (isAllowed) {
                subscriber.next({
                  type: RealtimeEventType.POST_NEW_COMMENT,
                  postId,
                  commentId,
                  parentId,
                })
              }
            })
        },
      }),
    )

    return this.withHeartbeat(events)
  }

  private withHeartbeat(events: Observable<RealtimeEvent>): Observable<MessageEvent> {
    const heartbeat = interval(HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ type: "heartbeat", data: "" })),
    )

    return merge(events.pipe(map(toMessage)), heartbeat)
  }
}
