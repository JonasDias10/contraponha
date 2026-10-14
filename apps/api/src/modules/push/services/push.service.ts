import { Inject, Injectable, Logger } from "@nestjs/common"
import { createTranslator } from "@contraponha/i18n"
import type { PushPlatform } from "@contraponha/types"

import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { PushSender, type PushMessage } from "#src/infrastructure/push/push-sender.js"
import { RealtimeBus } from "#src/infrastructure/realtime/realtime-bus.js"
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
  unreadByUser: Map<string, number>
}

interface PushToDevicesParams {
  due: DuePush[]
  recipientIds: string[]
  unreadByUser: Map<string, number>
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name)

  constructor(
    private readonly pushTokens: PushTokensRepository,
    private readonly notifications: NotificationsService,
    private readonly sender: PushSender,
    private readonly realtime: RealtimeBus,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  register(params: RegisterPushTokenParams): Promise<void> {
    return this.pushTokens.upsert(params)
  }

  unregister(params: UnregisterPushTokenParams): Promise<void> {
    return this.pushTokens.delete(params)
  }

  // A suspended account keeps no device: its sessions are gone, so pushes would only
  // reach a phone that can no longer open them.
  forgetDevices(userId: string): Promise<void> {
    return this.pushTokens.deleteForUser(userId)
  }

  // Delivers one batch of notifications that just became visible and reports whether there
  // may be more: open apps hear about it over the realtime stream, phones get a push. A
  // notification is claimed before sending, so a failed send is logged and not retried.
  async dispatchDue(): Promise<boolean> {
    const due = await this.notifications.claimDuePushes(DISPATCH_BATCH_SIZE)

    if (due.length === 0) return false

    const recipientIds = [...new Set(due.map(({ recipient }) => recipient.id))]
    const unreadByUser = await this.unreadCounts(recipientIds)

    for (const userId of recipientIds)
      this.realtime.publishToUser({ userId, unreadCount: unreadByUser.get(userId) ?? 0 })

    if (this.config.push.enabled) await this.pushToDevices({ due, recipientIds, unreadByUser })

    return due.length === DISPATCH_BATCH_SIZE
  }

  private async pushToDevices({
    due,
    recipientIds,
    unreadByUser,
  }: PushToDevicesParams): Promise<void> {
    const tokens = await this.pushTokens.listForUsers(recipientIds)

    const tokensByUser = tokens.reduce((byUser, { userId, token }) => {
      byUser.set(userId, [...(byUser.get(userId) ?? []), token])

      return byUser
    }, new Map<string, string[]>())

    const messages = this.buildMessages({ due, tokensByUser, unreadByUser })

    if (messages.length > 0) await this.deliver(messages)
  }

  private async unreadCounts(userIds: readonly string[]): Promise<Map<string, number>> {
    const counts = await Promise.all(
      userIds.map(async (id) => {
        const { count } = await this.notifications.countUnread(id)

        return [id, count] as const
      }),
    )

    return new Map(counts)
  }

  private buildMessages({ due, tokensByUser, unreadByUser }: BuildMessagesParams): PushMessage[] {
    const withDevices = due.filter(({ recipient }) => tokensByUser.has(recipient.id))

    return withDevices.flatMap(({ recipient, notification }) => {
      const t = createTranslator({ locale: userLocale(recipient) })
      const badge = unreadByUser.get(recipient.id) ?? 0

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
