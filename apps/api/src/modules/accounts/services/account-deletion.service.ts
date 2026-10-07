import { Inject, Injectable, Logger } from "@nestjs/common"
import { daysToMs } from "@ponto/config"
import { runTransaction, type Database } from "@ponto/database"
import { ApiErrorCode, type AccountDeletionStatus } from "@ponto/types"

import { AppError } from "#src/common/errors/app-error.js"
import { ACCOUNT_DELETION_GRACE_DAYS } from "#src/config/durations.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { ObjectStorage } from "#src/infrastructure/storage/object-storage.js"
import { DataExportsRepository } from "#src/modules/accounts/repositories/data-exports.repository.js"
import { AuthService } from "#src/modules/auth/services/auth.service.js"
import { SessionsService } from "#src/modules/auth/services/sessions.service.js"
import { BookmarksService } from "#src/modules/bookmarks/services/bookmarks.service.js"
import { CommentsService } from "#src/modules/comments/services/comments.service.js"
import { FollowsService } from "#src/modules/follows/services/follows.service.js"
import { MediaService } from "#src/modules/media/services/media.service.js"
import { NotificationsService } from "#src/modules/notifications/services/notifications.service.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"
import { ReactionsService } from "#src/modules/reactions/services/reactions.service.js"
import { TopicsService } from "#src/modules/topics/services/topics.service.js"
import type { User } from "#src/modules/users/domain/user.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

export interface ScheduleDeletionRequest {
  userId: string
  confirmHandle: string
  deleteContributions: boolean
}

interface PurgeOutcome {
  storageKeys: string[]
  revokedTokenHashes: string[]
}

function toStatus(user: User): AccountDeletionStatus {
  return {
    scheduledFor: user.deletionScheduledAt?.toISOString() ?? null,
    deleteContributions: user.deleteContributions,
  }
}

@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name)

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly storage: ObjectStorage,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly sessionsService: SessionsService,
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
    private readonly reactionsService: ReactionsService,
    private readonly followsService: FollowsService,
    private readonly topicsService: TopicsService,
    private readonly bookmarksService: BookmarksService,
    private readonly notificationsService: NotificationsService,
    private readonly mediaService: MediaService,
    private readonly exportsRepository: DataExportsRepository,
  ) {}

  async status(userId: string): Promise<AccountDeletionStatus> {
    const user = await this.usersService.getById(userId)
    return toStatus(user)
  }

  // Asking for deletion signs the person out everywhere; signing in again within the grace
  // period cancels it. The handle must be typed back as confirmation.
  async schedule({
    userId,
    confirmHandle,
    deleteContributions,
  }: ScheduleDeletionRequest): Promise<AccountDeletionStatus> {
    const user = await this.usersService.getById(userId)

    if (user.handle !== confirmHandle) {
      throw new AppError(ApiErrorCode.VALIDATION_FAILED, {
        details: [{ path: "confirmHandle", code: "mismatch" }],
      })
    }

    const scheduled = await this.usersService.scheduleDeletion({
      id: userId,
      scheduledFor: new Date(Date.now() + daysToMs(ACCOUNT_DELETION_GRACE_DAYS)),
      deleteContributions,
    })

    const revoked = await runTransaction({
      db: this.db,
      work: (tx) => this.sessionsService.revokeAll({ userId, executor: tx }),
    })

    await this.sessionsService.evictFromCache(revoked)

    return toStatus(scheduled)
  }

  async cancel(userId: string): Promise<AccountDeletionStatus> {
    const user = await this.usersService.scheduleDeletion({
      id: userId,
      scheduledFor: null,
      deleteContributions: false,
    })

    return toStatus(user)
  }

  // Deletes the accounts whose grace period is over. Returns how many were deleted.
  async purgeDue(): Promise<number> {
    const due = await this.usersService.listDueForDeletion(new Date())

    for (const user of due) {
      try {
        await this.purge(user)
      } catch (error) {
        this.logger.error({ err: error, userId: user.id }, "Account deletion failed")
      }
    }

    return due.length
  }

  // Each owner removes its own data in one transaction; files and cached sessions go after
  // the commit. The user row stays as an anonymous tombstone for other people's discussions.
  async purge(user: User): Promise<void> {
    const outcome = await runTransaction({
      db: this.db,
      work: async (tx): Promise<PurgeOutcome> => {
        const postKeys = await this.postsService.purgeAuthor({ authorId: user.id, executor: tx })

        if (user.deleteContributions)
          await this.commentsService.purgeAuthor({ authorId: user.id, executor: tx })

        await this.reactionsService.purgeUser({ userId: user.id, executor: tx })

        await this.followsService.purgeUser({ userId: user.id, executor: tx })

        await this.topicsService.unfollowAll({ userId: user.id, executor: tx })

        await this.bookmarksService.purgeUser({ userId: user.id, executor: tx })

        await this.notificationsService.purgeUser({ userId: user.id, executor: tx })

        const mediaKeys = await this.mediaService.purgeOwner({ ownerId: user.id, executor: tx })

        const exportKeys = await this.exportsRepository.deleteForUser({
          userId: user.id,
          executor: tx,
        })

        const revokedTokenHashes = await this.authService.forgetCredentials({
          userId: user.id,
          executor: tx,
        })

        await this.usersService.anonymize({ id: user.id, executor: tx })

        return { storageKeys: [...postKeys, ...mediaKeys, ...exportKeys], revokedTokenHashes }
      },
    })

    await this.sessionsService.evictFromCache(outcome.revokedTokenHashes)

    await this.storage.delete(outcome.storageKeys)
  }
}
