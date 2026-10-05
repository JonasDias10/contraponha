import { Inject, Injectable, type OnApplicationShutdown } from "@nestjs/common"
import nodemailer, { type Transporter } from "nodemailer"

import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { EmailSender, type EmailMessage } from "./email-sender.js"

@Injectable()
export class SmtpEmailSender extends EmailSender implements OnApplicationShutdown {
  private readonly transporter: Transporter
  private readonly from: string

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super()

    const { host, port, secure, user, password } = config.email.smtp

    this.from = config.email.from

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && password ? { user, pass: password } : undefined,
    })
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...message })
  }

  onApplicationShutdown(): void {
    this.transporter.close()
  }
}
