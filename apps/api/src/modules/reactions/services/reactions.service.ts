import { Inject, Injectable } from "@nestjs/common"
import { REACTIONS_PER_TARGET_MAX } from "@ponto/config"
import { runTransaction, type Database, type DatabaseExecutor } from "@ponto/database"
import {
  ApiErrorCode,
  ReactionKind,
  ReactionTargetType,
  type ViewerReactionsResponse,
} from "@ponto/types"

import { AppError } from "#src/common/errors/app-error.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { CommentsService } from "#src/modules/comments/services/comments.service.js"
import { NotificationsService } from "#src/modules/notifications/services/notifications.service.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"
import {
  ReactionsRepository,
  type ReactionTarget,
} from "#src/modules/reactions/repositories/reactions.repository.js"

export interface ReactParams {
  target: ReactionTarget
  userId: string
  kind: ReactionKind
}

export interface ListViewerReactionsParams {
  userId: string
  targetType: ReactionTargetType
  targetIds: readonly string[]
}

export interface PurgeReactionsParams {
  userId: string
  executor: DatabaseExecutor
}

interface AdjustTargetCountParams {
  target: ReactionTarget
  kind: ReactionKind
  delta: 1 | -1
  executor: DatabaseExecutor
}

interface AddWithinLimitParams extends ReactParams {
  given: number
  executor: DatabaseExecutor
}

interface NotifyReactionParams {
  target: ReactionTarget
  kind: ReactionKind
  userId: string
  authorId: string
  isFirstReaction: boolean
  executor: DatabaseExecutor
}

@Injectable()
export class ReactionsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly reactionsRepository: ReactionsRepository,
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async react({ target, userId, kind }: ReactParams): Promise<void> {
    const authorId = await this.ensureTargetIsActive(target)

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.reactionsRepository.lockUserTarget({ target, userId, executor: tx })

        const given = await this.reactionsRepository.countByUserOnTarget({
          target,
          userId,
          executor: tx,
        })

        const isAdded = await this.addWithinLimit({ target, userId, kind, given, executor: tx })

        if (!isAdded) return

        await this.adjustTargetCount({ target, kind, delta: 1, executor: tx })

        await this.notifyReaction({
          target,
          kind,
          userId,
          authorId,
          isFirstReaction: given === 0,
          executor: tx,
        })
      },
    })
  }

  async unreact({ target, userId, kind }: ReactParams): Promise<void> {
    await this.ensureTargetIsActive(target)

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        const isRemoved = await this.reactionsRepository.remove({
          target,
          userId,
          kind,
          executor: tx,
        })

        if (isRemoved) await this.adjustTargetCount({ target, kind, delta: -1, executor: tx })
      },
    })
  }

  async listViewerReactions({
    userId,
    targetType,
    targetIds,
  }: ListViewerReactionsParams): Promise<ViewerReactionsResponse> {
    const rows = await this.reactionsRepository.listByUser({ userId, targetType, targetIds })
    const kindsByTarget = new Map<string, ReactionKind[]>(targetIds.map((id) => [id, []]))

    for (const { targetId, kind } of rows) if (targetId) kindsByTarget.get(targetId)?.push(kind)

    return {
      reactions: [...kindsByTarget].map(([targetId, kinds]) => ({ targetId, kinds })),
    }
  }

  // Account deletion: takes back every reaction the person gave, keeping counters exact.
  async purgeUser({ userId, executor }: PurgeReactionsParams): Promise<void> {
    const given = await this.reactionsRepository.listAllByUser(userId)

    for (const { postId, commentId, kind } of given) {
      const target: ReactionTarget = postId
        ? { type: ReactionTargetType.POST, id: postId }
        : { type: ReactionTargetType.COMMENT, id: commentId ?? "" }

      await this.adjustTargetCount({ target, kind, delta: -1, executor })
    }

    await this.reactionsRepository.deleteAllByUser({ userId, executor })
  }

  private async addWithinLimit({
    target,
    userId,
    kind,
    given,
    executor,
  }: AddWithinLimitParams): Promise<boolean> {
    const isAdded = await this.reactionsRepository.add({ target, userId, kind, executor })

    if (isAdded && given >= REACTIONS_PER_TARGET_MAX)
      throw new AppError(ApiErrorCode.REACTION_LIMIT_REACHED)

    return isAdded
  }

  // "Needs a source" is a request the author should see; other reactions notify once per
  // person and target, so giving a second reaction does not count as a new reactor.
  private async notifyReaction({
    target,
    kind,
    userId,
    authorId,
    isFirstReaction,
    executor,
  }: NotifyReactionParams): Promise<void> {
    const isPost = target.type === ReactionTargetType.POST
    const targetIds = isPost ? { postId: target.id } : { commentId: target.id }

    if (kind === ReactionKind.NEEDS_SOURCE) {
      await this.notificationsService.notify({
        recipientId: authorId,
        actorId: userId,
        type: "source_requested",
        ...targetIds,
        executor,
      })

      return
    }

    if (!isFirstReaction) return

    await this.notificationsService.notify({
      recipientId: authorId,
      actorId: userId,
      type: isPost ? "post_reacted" : "comment_reacted",
      ...targetIds,
      executor,
    })
  }

  // Returns the author of the target, who is notified of new reactions.
  private async ensureTargetIsActive(target: ReactionTarget): Promise<string> {
    if (target.type === ReactionTargetType.POST) {
      const post = await this.postsService.getActivePost(target.id)
      return post.authorId
    }

    const comment = await this.commentsService.getActiveComment(target.id)
    return comment.authorId
  }

  private adjustTargetCount({
    target,
    kind,
    delta,
    executor,
  }: AdjustTargetCountParams): Promise<void> {
    if (target.type === ReactionTargetType.POST)
      return this.postsService.adjustReactionCount({ postId: target.id, kind, delta, executor })

    return this.commentsService.adjustReactionCount({ commentId: target.id, kind, delta, executor })
  }
}
