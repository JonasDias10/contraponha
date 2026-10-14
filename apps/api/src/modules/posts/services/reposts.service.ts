import { Inject, Injectable } from "@nestjs/common"
import { runTransaction, type Database, type DatabaseExecutor } from "@contraponha/database"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { NotificationsService } from "#src/modules/notifications/services/notifications.service.js"
import { PostsRepository } from "#src/modules/posts/repositories/posts.repository.js"
import { RepostsRepository } from "#src/modules/posts/repositories/reposts.repository.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"
import { UserRelationsService } from "#src/modules/users/services/user-relations.service.js"

export interface RepostParams {
  userId: string
  postId: string
}

export interface PurgeRepostsParams {
  userId: string
  executor: DatabaseExecutor
}

// Reposting shares a post, as is, with the reposter's followers. Both calls are idempotent
// and keep posts.repost_count exact.
@Injectable()
export class RepostsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly repostsRepository: RepostsRepository,
    private readonly postsRepository: PostsRepository,
    private readonly postsService: PostsService,
    private readonly notificationsService: NotificationsService,
    private readonly relations: UserRelationsService,
  ) {}

  async repost({ userId, postId }: RepostParams): Promise<void> {
    const post = await this.postsService.getActivePost(postId)

    await this.relations.assertCanInteract({ actorId: userId, targetId: post.authorId })

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        const isAdded = await this.repostsRepository.add({ userId, postId, executor: tx })

        if (!isAdded) return

        await this.postsRepository.incrementShareCount({
          id: postId,
          counter: "repostCount",
          delta: 1,
          executor: tx,
        })

        await this.notificationsService.notify({
          recipientId: post.authorId,
          actorId: userId,
          type: "post_reposted",
          postId,
          executor: tx,
        })
      },
    })
  }

  async unrepost({ userId, postId }: RepostParams): Promise<void> {
    await this.postsService.assertExists(postId)

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        const isRemoved = await this.repostsRepository.remove({ userId, postId, executor: tx })

        if (!isRemoved) return

        await this.postsRepository.incrementShareCount({
          id: postId,
          counter: "repostCount",
          delta: -1,
          executor: tx,
        })
      },
    })
  }

  // Account deletion: takes back every repost the person made.
  async purgeUser({ userId, executor }: PurgeRepostsParams): Promise<void> {
    const postIds = await this.repostsRepository.deleteByUser({ userId, executor })

    for (const id of postIds) {
      await this.postsRepository.incrementShareCount({
        id,
        counter: "repostCount",
        delta: -1,
        executor,
      })
    }
  }
}
