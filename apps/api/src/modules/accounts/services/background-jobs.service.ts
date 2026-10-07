import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common"

import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { BACKGROUND_JOBS_INTERVAL_MS } from "#src/config/durations.js"
import { AccountDeletionService } from "#src/modules/accounts/services/account-deletion.service.js"
import { DataExportsService } from "#src/modules/accounts/services/data-exports.service.js"

// Periodic work that runs inside the API process: data exports, scheduled account
// deletions and expired export files. Each step is safe to run on several instances.
@Injectable()
export class BackgroundJobsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(BackgroundJobsService.name)
  private timer: NodeJS.Timeout | undefined
  private running: Promise<void> | undefined

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly dataExports: DataExportsService,
    private readonly accountDeletion: AccountDeletionService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.backgroundJobs.enabled) return

    this.timer = setInterval(() => {
      this.running ??= this.runOnce().finally(() => {
        this.running = undefined
      })
    }, BACKGROUND_JOBS_INTERVAL_MS)
  }

  async onApplicationShutdown(): Promise<void> {
    clearInterval(this.timer)

    await this.running
  }

  async runOnce(): Promise<void> {
    try {
      while (await this.dataExports.processNext()) {
        // Keep going until the queue is empty.
      }

      await this.accountDeletion.purgeDue()

      await this.dataExports.removeExpiredFiles()
    } catch (error) {
      this.logger.error({ err: error }, "Background jobs run failed")
    }
  }
}
