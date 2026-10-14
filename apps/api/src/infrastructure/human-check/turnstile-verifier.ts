import { Inject, Injectable, Logger } from "@nestjs/common"
import { z } from "zod"

import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { HumanVerifier, type VerifyHumanParams } from "./human-verifier.js"

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
const VERIFY_TIMEOUT_MS = 5_000

const siteverifySchema = z.object({ success: z.boolean() })

@Injectable()
export class TurnstileVerifier extends HumanVerifier {
  private readonly logger = new Logger(TurnstileVerifier.name)

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super()
  }

  async verify({ token, remoteIp }: VerifyHumanParams): Promise<boolean> {
    const secret = this.config.humanCheck.turnstileSecretKey

    if (!secret) return true

    if (!token) return false

    const body = new URLSearchParams({ secret, response: token })

    if (remoteIp) body.set("remoteip", remoteIp)

    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      })

      const payload: unknown = await response.json()

      return siteverifySchema.parse(payload).success
    } catch (error) {
      // Failing closed: if Cloudflare cannot be reached, sign-ups wait instead of opening.
      this.logger.error({ err: error }, "Turnstile verification failed")

      return false
    }
  }
}
