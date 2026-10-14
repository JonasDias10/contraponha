import type { AddressInfo } from "node:net"

import type { NestExpressApplication } from "@nestjs/platform-express"
import type { RealtimeEvent } from "@contraponha/types"

export interface SseStream {
  next: (type: RealtimeEvent["type"]) => Promise<RealtimeEvent>
  close: () => void
}

export interface OpenStreamParams {
  app: NestExpressApplication
  path: string
  token: string
}

const EVENT_TIMEOUT_MS = 5_000

// Reads a Server-Sent Events response from the running test app and hands out parsed
// events by type, skipping heartbeats.
export async function openStream({ app, path, token }: OpenStreamParams): Promise<SseStream> {
  const server = app.getHttpServer()

  if (!server.listening) await new Promise<void>((resolve) => server.listen(0, resolve))

  const { port } = server.address() as AddressInfo
  const controller = new AbortController()

  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: "text/event-stream" },
    signal: controller.signal,
  })

  if (!response.body) throw new Error(`No stream from ${path} (${response.status})`)

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  const received: RealtimeEvent[] = []
  let buffer = ""

  const pump = async (): Promise<void> => {
    const { value, done } = await reader.read()

    if (done) return

    buffer += value

    const blocks = buffer.split("\n\n")

    buffer = blocks.pop() ?? ""

    for (const block of blocks) {
      const data = block
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice("data: ".length)

      if (data) received.push(JSON.parse(data) as RealtimeEvent)
    }
  }

  const next = async (type: RealtimeEvent["type"]): Promise<RealtimeEvent> => {
    const deadline = Date.now() + EVENT_TIMEOUT_MS

    while (Date.now() < deadline) {
      const index = received.findIndex((event) => event.type === type)

      if (index >= 0) return received.splice(index, 1)[0] as RealtimeEvent

      await Promise.race([pump(), new Promise((resolve) => setTimeout(resolve, 100))])
    }

    throw new Error(`No ${type} event within ${EVENT_TIMEOUT_MS} ms`)
  }

  return { next, close: () => controller.abort() }
}
