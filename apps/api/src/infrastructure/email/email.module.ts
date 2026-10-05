import { Global, Module } from "@nestjs/common"

import { EmailSender } from "./email-sender.js"
import { SmtpEmailSender } from "./smtp-email-sender.js"

@Global()
@Module({
  providers: [{ provide: EmailSender, useClass: SmtpEmailSender }],
  exports: [EmailSender],
})
export class EmailModule {}
