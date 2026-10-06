import { Inject, Injectable } from "@nestjs/common"
import { runTransaction, type Database, type DatabaseExecutor } from "@ponto/database"
import { ReactionTargetType, type ReactionKind, type ViewerReactionsResponse } from "@ponto/types"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { CommentsService } from "#src/modules/comments/services/comments.service.js"
import { NotificationsService } from "#src/modules/notifications/services/notifications.service.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"
import { exclusiveCounterpart } from "#src/modules/reactions/domain/reaction-rules.js"
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

interface AdjustTargetCountParams {
  target: ReactionTarget
  kind: ReactionKind
  delta: 1 | -1
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
    const targetAuthorId = await this.ensureTargetIsActive(target)

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        const isAdded = await this.reactionsRepository.add({ target, userId, kind, executor: tx })

        if (!isAdded) return

        await this.adjustTargetCount({ target, kind, delta: 1, executor: tx })

        await this.notificationsService.notify({
          recipientId: targetAuthorId,
          actorId: userId,
          ...(target.type === ReactionTargetType.POST
            ? { type: "post_reacted", postId: target.id }
            : { type: "comment_reacted", commentId: target.id }),
          executor: tx,
        })

        const counterpart = exclusiveCounterpart(kind)

        if (!counterpart) return

        const isCounterpartRemoved = await this.reactionsRepository.remove({
          target,
          userId,
          kind: counterpart,
          executor: tx,
        })

        if (isCounterpartRemoved)
          await this.adjustTargetCount({ target, kind: counterpart, delta: -1, executor: tx })
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
