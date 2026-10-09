import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common"

import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { PUSH_DISPATCH_INTERVAL_MS } from "#src/config/durations.js"
import { PushService } from "#src/modules/push/services/push.service.js"

// Polls for notifications that became visible (right away, or at a digest hour) and sends
// their pushes. Runs on its own short interval so pushes are not held by slower jobs.
@Injectable()
export class PushDispatchService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(PushDispatchService.name)
  private timer: NodeJS.Timeout | undefined
  private running: Promise<void> | undefined

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly pushService: PushService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.backgroundJobs.enabled || !this.config.push.enabled) return

    this.timer = setInterval(() => {
      this.running ??= this.runOnce().finally(() => {
        this.running = undefined
      })
    }, PUSH_DISPATCH_INTERVAL_MS)
  }

  async onApplicationShutdown(): Promise<void> {
    clearInterval(this.timer)

    await this.running
  }

  async runOnce(): Promise<void> {
    try {
      while (await this.pushService.dispatchDue()) {
        // Keep going while full batches come back.
      }
    } catch (error) {
      this.logger.error({ err: error }, "Push dispatch run failed")
    }
  }
}
