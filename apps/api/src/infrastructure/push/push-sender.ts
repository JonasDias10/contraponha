export interface PushMessage {
  to: string
  title: string
  body: string
  data: Record<string, string | null>
  badge?: number
}

export interface PushDelivery {
  token: string
  // The device uninstalled the app or revoked permission; the token should be forgotten.
  isTokenInvalid: boolean
}

export abstract class PushSender {
  abstract send(messages: readonly PushMessage[]): Promise<PushDelivery[]>
}
