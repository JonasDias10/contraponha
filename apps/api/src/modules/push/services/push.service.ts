import { Injectable, Logger } from "@nestjs/common"
import { createTranslator } from "@contraponha/i18n"
import type { PushPlatform } from "@contraponha/types"

import { PushSender, type PushMessage } from "#src/infrastructure/push/push-sender.js"
import {
  NotificationsService,
  type DuePush,
} from "#src/modules/notifications/services/notifications.service.js"
import { toPushMessage } from "#src/modules/push/domain/push-message.js"
import { PushTokensRepository } from "#src/modules/push/repositories/push-tokens.repository.js"
import { userLocale } from "#src/modules/users/domain/user.js"

const DISPATCH_BATCH_SIZE = 100

export interface RegisterPushTokenParams {
  userId: string
  token: string
  platform: PushPlatform
}

export interface UnregisterPushTokenParams {
  userId: string
  token: string
}

interface BuildMessagesParams {
  due: DuePush[]
  tokensByUser: Map<string, string[]>
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name)

  constructor(
    private readonly pushTokens: PushTokensRepository,
    private readonly notifications: NotificationsService,
    private readonly sender: PushSender,
  ) {}

  register(params: RegisterPushTokenParams): Promise<void> {
    return this.pushTokens.upsert(params)
  }

  unregister(params: UnregisterPushTokenParams): Promise<void> {
    return this.pushTokens.delete(params)
  }

  // Sends one batch and reports whether there may be more. A notification is claimed
  // before sending, so a failed send is logged and not retried (no duplicate pushes).
  async dispatchDue(): Promise<boolean> {
    const due = await this.notifications.claimDuePushes(DISPATCH_BATCH_SIZE)

    if (due.length === 0) return false

    const recipientIds = [...new Set(due.map(({ recipient }) => recipient.id))]
    const tokens = await this.pushTokens.listForUsers(recipientIds)

    const tokensByUser = tokens.reduce((byUser, { userId, token }) => {
      byUser.set(userId, [...(byUser.get(userId) ?? []), token])

      return byUser
    }, new Map<string, string[]>())

    const messages = await this.buildMessages({ due, tokensByUser })

    if (messages.length > 0) await this.deliver(messages)

    return due.length === DISPATCH_BATCH_SIZE
  }

  private async buildMessages({ due, tokensByUser }: BuildMessagesParams): Promise<PushMessage[]> {
    const withDevices = due.filter(({ recipient }) => tokensByUser.has(recipient.id))
    const recipientIds = [...new Set(withDevices.map(({ recipient }) => recipient.id))]

    const unreadCounts = await Promise.all(
      recipientIds.map(async (id) => {
        const { count } = await this.notifications.countUnread(id)

        return [id, count] as const
      }),
    )

    const badgeByUser = new Map(unreadCounts)

    return withDevices.flatMap(({ recipient, notification }) => {
      const t = createTranslator({ locale: userLocale(recipient) })
      const badge = badgeByUser.get(recipient.id) ?? 0

      return (tokensByUser.get(recipient.id) ?? []).map((token) =>
        toPushMessage({ token, notification, badge, t }),
      )
    })
  }

  private async deliver(messages: PushMessage[]): Promise<void> {
    try {
      const deliveries = await this.sender.send(messages)

      const invalid = deliveries
        .filter(({ isTokenInvalid }) => isTokenInvalid)
        .map(({ token }) => token)

      await this.pushTokens.deleteTokens(invalid)
    } catch (error) {
      this.logger.error({ err: error, count: messages.length }, "Failed to send push batch")
    }
  }
}
