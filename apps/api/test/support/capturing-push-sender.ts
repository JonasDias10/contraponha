import {
  PushSender,
  type PushDelivery,
  type PushMessage,
} from "#src/infrastructure/push/push-sender.js"

export class CapturingPushSender extends PushSender {
  readonly messages: PushMessage[] = []
  readonly invalidTokens = new Set<string>()

  send(messages: readonly PushMessage[]): Promise<PushDelivery[]> {
    this.messages.push(...messages)

    return Promise.resolve(
      messages.map(({ to }) => ({ token: to, isTokenInvalid: this.invalidTokens.has(to) })),
    )
  }

  sentTo(token: string): PushMessage[] {
    return this.messages.filter(({ to }) => to === token)
  }
}
