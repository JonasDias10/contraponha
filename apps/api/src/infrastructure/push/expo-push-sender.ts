import { Inject, Injectable, Logger } from "@nestjs/common"
import { z } from "zod"

import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { PUSH_SEND_TIMEOUT_MS } from "#src/config/durations.js"
import { PushSender, type PushDelivery, type PushMessage } from "./push-sender.js"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
const EXPO_BATCH_SIZE = 100

const ticketsSchema = z.object({
  data: z.array(
    z.object({
      status: z.enum(["ok", "error"]),
      message: z.string().optional(),
      details: z.object({ error: z.string().optional() }).optional(),
    }),
  ),
})

function chunk<T>(items: readonly T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / EXPO_BATCH_SIZE) }, (_, index) =>
    items.slice(index * EXPO_BATCH_SIZE, (index + 1) * EXPO_BATCH_SIZE),
  )
}

// Talks to the Expo push service, which relays to APNs and FCM. Delivery receipts are not
// polled: an invalid token is detected on the next send and removed then.
@Injectable()
export class ExpoPushSender extends PushSender {
  private readonly logger = new Logger(ExpoPushSender.name)
  private readonly headers: Record<string, string>

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super()

    const { expoAccessToken } = config.push

    this.headers = {
      "content-type": "application/json",
      accept: "application/json",
      ...(expoAccessToken ? { authorization: `Bearer ${expoAccessToken}` } : {}),
    }
  }

  async send(messages: readonly PushMessage[]): Promise<PushDelivery[]> {
    const batches = await Promise.all(chunk(messages).map((batch) => this.sendBatch(batch)))

    return batches.flat()
  }

  private async sendBatch(batch: readonly PushMessage[]): Promise<PushDelivery[]> {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(batch.map((message) => ({ ...message, sound: "default" }))),
      signal: AbortSignal.timeout(PUSH_SEND_TIMEOUT_MS),
    })

    if (!response.ok) throw new Error(`Expo push service answered ${response.status}`)

    const payload: unknown = await response.json()
    const { data: tickets } = ticketsSchema.parse(payload)

    return batch.map((message, index) => {
      const ticket = tickets[index]

      if (ticket?.status === "error")
        this.logger.warn({ error: ticket.details?.error }, "Push ticket returned an error")

      return {
        token: message.to,
        isTokenInvalid: ticket?.details?.error === "DeviceNotRegistered",
      }
    })
  }
}
