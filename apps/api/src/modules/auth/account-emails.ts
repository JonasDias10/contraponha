import { createTranslator, type Locale, type MessageKey } from "@ponto/i18n"

import type { EmailMessage } from "#src/infrastructure/email/email-sender.js"

export interface AccountEmailInput {
  to: string
  name: string
  locale: Locale
  link: string
}

interface EmailCopy {
  subject: MessageKey
  body: MessageKey
  expiry: MessageKey
  ignore: MessageKey
  expiryParams: Record<string, number>
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function buildAccountEmail(
  { to, name, locale, link }: AccountEmailInput,
  copy: EmailCopy,
): EmailMessage {
  const t = createTranslator(locale)
  const paragraphs = [
    t("emails.greeting", { name }),
    t(copy.body),
    link,
    t(copy.expiry, copy.expiryParams),
    t(copy.ignore),
    t("emails.signature"),
  ]
  const html = paragraphs
    .map((paragraph) =>
      paragraph === link
        ? `<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`
        : `<p>${escapeHtml(paragraph)}</p>`,
    )
    .join("\n")

  return { to, subject: t(copy.subject), text: paragraphs.join("\n\n"), html }
}

export function buildEmailVerificationEmail(
  input: AccountEmailInput,
  ttlHours: number,
): EmailMessage {
  return buildAccountEmail(input, {
    subject: "emails.verifyEmail.subject",
    body: "emails.verifyEmail.body",
    expiry: "emails.verifyEmail.expiry",
    ignore: "emails.verifyEmail.ignore",
    expiryParams: { hours: ttlHours },
  })
}

export function buildPasswordResetEmail(
  input: AccountEmailInput,
  ttlMinutes: number,
): EmailMessage {
  return buildAccountEmail(input, {
    subject: "emails.passwordReset.subject",
    body: "emails.passwordReset.body",
    expiry: "emails.passwordReset.expiry",
    ignore: "emails.passwordReset.ignore",
    expiryParams: { minutes: ttlMinutes },
  })
}
