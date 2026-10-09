import { Inject, Injectable } from "@nestjs/common"
import { runTransaction, type Database } from "@contraponha/database"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { MediaService } from "#src/modules/media/services/media.service.js"
import type { User } from "#src/modules/users/domain/user.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

export interface SetProfilePhotoParams {
  userId: string
  mediaId: string
}

interface PhotoUpdate {
  user: User
  replacedKeys: string[]
}

@Injectable()
export class ProfilePhotoService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly usersService: UsersService,
    private readonly mediaService: MediaService,
  ) {}

  // The user row is updated first so its lock serializes concurrent photo changes.
  async set({ userId, mediaId }: SetProfilePhotoParams): Promise<User> {
    await this.mediaService.verifyProfilePhoto({ ownerId: userId, mediaId })

    const { user, replacedKeys } = await runTransaction({
      db: this.db,
      work: async (tx): Promise<PhotoUpdate> => {
        await this.usersService.updateProfile({
          id: userId,
          data: { avatarUrl: null },
          executor: tx,
        })

        const change = await this.mediaService.useAsProfilePhoto({
          ownerId: userId,
          mediaId,
          executor: tx,
        })

        const updated = await this.usersService.updateProfile({
          id: userId,
          data: { avatarUrl: change.url },
          executor: tx,
        })

        return { user: updated, replacedKeys: change.replacedKeys }
      },
    })

    await this.mediaService.deleteStoredObjects(replacedKeys)

    return user
  }

  async remove(userId: string): Promise<User> {
    const { user, replacedKeys } = await runTransaction({
      db: this.db,
      work: async (tx): Promise<PhotoUpdate> => {
        const updated = await this.usersService.updateProfile({
          id: userId,
          data: { avatarUrl: null },
          executor: tx,
        })

        const removed = await this.mediaService.removeProfilePhoto({
          ownerId: userId,
          executor: tx,
        })

        return { user: updated, replacedKeys: removed }
      },
    })

    await this.mediaService.deleteStoredObjects(replacedKeys)

    return user
  }
}
