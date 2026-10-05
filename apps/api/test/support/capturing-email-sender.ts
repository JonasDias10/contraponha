import { EmailSender, type EmailMessage } from "#src/infrastructure/email/email-sender.js"

export class CapturingEmailSender extends EmailSender {
  readonly messages: EmailMessage[] = []

  send(message: EmailMessage): Promise<void> {
    this.messages.push(message)

    return Promise.resolve()
  }

  lastTo(recipient: string): EmailMessage | undefined {
    return this.messages.findLast((message) => message.to === recipient)
  }

  tokenSentTo(recipient: string): string {
    const token = this.lastTo(recipient)?.text.match(/[?&]token=([A-Za-z0-9_-]+)/)?.[1]

    if (!token) throw new Error(`No email with a token was sent to ${recipient}`)

    return token
  }
}
