import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common"
import type { Redis } from "ioredis"
import { z } from "zod"

import { REDIS } from "#src/infrastructure/redis/redis.module.js"

// Redis channels carry facts; each API instance fans them out to its own SSE connections.
const USERS_CHANNEL = "realtime:users"
const POSTS_CHANNEL = "realtime:posts"
const COMMENTS_CHANNEL = "realtime:comments"

const userMessageSchema = z.object({ userId: z.uuid(), unreadCount: z.number().int() })
const postMessageSchema = z.object({ postId: z.uuid(), authorId: z.uuid() })

const commentMessageSchema = z.object({
  postId: z.uuid(),
  commentId: z.uuid(),
  parentId: z.uuid().nullable(),
  authorId: z.uuid(),
})

export type UserMessage = z.output<typeof userMessageSchema>
export type PostMessage = z.output<typeof postMessageSchema>
export type CommentMessage = z.output<typeof commentMessageSchema>

type Listener<T> = (message: T) => void

export interface ListenParams<T> {
  key: string
  listener: Listener<T>
}

interface EmitParams<T> {
  key: string
  message: T
}

interface PublishParams {
  channel: string
  message: object
}

interface DispatchParams {
  channel: string
  payload: string
}

class ListenerRegistry<T> {
  private readonly byKey = new Map<string, Set<Listener<T>>>()

  add({ key, listener }: ListenParams<T>): () => void {
    const listeners = this.byKey.get(key) ?? new Set<Listener<T>>()

    listeners.add(listener)

    this.byKey.set(key, listeners)

    return () => {
      listeners.delete(listener)

      if (listeners.size === 0) this.byKey.delete(key)
    }
  }

  emit({ key, message }: EmitParams<T>): void {
    for (const listener of this.byKey.get(key) ?? []) listener(message)
  }
}

const ALL = "*"

@Injectable()
export class RealtimeBus implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RealtimeBus.name)
  private readonly subscriber: Redis
  private readonly users = new ListenerRegistry<UserMessage>()
  private readonly posts = new ListenerRegistry<PostMessage>()
  private readonly comments = new ListenerRegistry<CommentMessage>()

  constructor(@Inject(REDIS) private readonly redis: Redis) {
    this.subscriber = redis.duplicate({ connectionName: "contraponha-api-realtime" })
  }

  // Not awaited: without Redis the API still serves everything else, and ioredis subscribes
  // again by itself once the connection comes back.
  onModuleInit(): void {
    this.subscriber.on("message", (channel: string, payload: string) =>
      this.dispatch({ channel, payload }),
    )

    this.subscriber.on("error", (error: Error) =>
      this.logger.warn({ err: error }, "Realtime subscriber connection error"),
    )

    this.subscriber
      .subscribe(USERS_CHANNEL, POSTS_CHANNEL, COMMENTS_CHANNEL)
      .catch((error: unknown) => {
        this.logger.warn({ err: error }, "Realtime subscription failed; retrying on reconnect")
      })
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.subscriber.status === "ready") {
      await this.subscriber.quit()

      return
    }

    this.subscriber.disconnect()
  }

  // Publishing is best effort: a lost event only delays what the next refetch shows.
  publishToUser(message: UserMessage): void {
    this.publish({ channel: USERS_CHANNEL, message })
  }

  publishPost(message: PostMessage): void {
    this.publish({ channel: POSTS_CHANNEL, message })
  }

  publishComment(message: CommentMessage): void {
    this.publish({ channel: COMMENTS_CHANNEL, message })
  }

  onUser({ key, listener }: ListenParams<UserMessage>): () => void {
    return this.users.add({ key, listener })
  }

  onAnyPost(listener: Listener<PostMessage>): () => void {
    return this.posts.add({ key: ALL, listener })
  }

  onPostComments({ key, listener }: ListenParams<CommentMessage>): () => void {
    return this.comments.add({ key, listener })
  }

  private publish({ channel, message }: PublishParams): void {
    this.redis.publish(channel, JSON.stringify(message)).catch((error: unknown) => {
      this.logger.warn({ err: error, channel }, "Failed to publish realtime event")
    })
  }

  private dispatch({ channel, payload }: DispatchParams): void {
    const data: unknown = JSON.parse(payload)

    if (channel === USERS_CHANNEL) {
      const message = userMessageSchema.parse(data)

      this.users.emit({ key: message.userId, message })

      return
    }

    if (channel === POSTS_CHANNEL) {
      this.posts.emit({ key: ALL, message: postMessageSchema.parse(data) })

      return
    }

    const message = commentMessageSchema.parse(data)

    this.comments.emit({ key: message.postId, message })
  }
}
