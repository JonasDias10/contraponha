import { createTranslator, type Locale, type MessageKey } from "@ponto/i18n"

import type { EmailMessage } from "#src/infrastructure/email/email-sender.js"

export interface AccountEmailRecipient {
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

interface BuildAccountEmailParams {
  recipient: AccountEmailRecipient
  copy: EmailCopy
}

function buildAccountEmail({ recipient, copy }: BuildAccountEmailParams): EmailMessage {
  const { to, name, locale, link } = recipient
  const t = createTranslator({ locale })

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

export interface BuildEmailVerificationEmailParams {
  recipient: AccountEmailRecipient
  ttlHours: number
}

export function buildEmailVerificationEmail({
  recipient,
  ttlHours,
}: BuildEmailVerificationEmailParams): EmailMessage {
  return buildAccountEmail({
    recipient,
    copy: {
      subject: "emails.verifyEmail.subject",
      body: "emails.verifyEmail.body",
      expiry: "emails.verifyEmail.expiry",
      ignore: "emails.verifyEmail.ignore",
      expiryParams: { hours: ttlHours },
    },
  })
}

export interface BuildPasswordResetEmailParams {
  recipient: AccountEmailRecipient
  ttlMinutes: number
}

export function buildPasswordResetEmail({
  recipient,
  ttlMinutes,
}: BuildPasswordResetEmailParams): EmailMessage {
  return buildAccountEmail({
    recipient,
    copy: {
      subject: "emails.passwordReset.subject",
      body: "emails.passwordReset.body",
      expiry: "emails.passwordReset.expiry",
      ignore: "emails.passwordReset.ignore",
      expiryParams: { minutes: ttlMinutes },
    },
  })
}

export interface BuildMagicLinkEmailParams {
  recipient: AccountEmailRecipient
  ttlMinutes: number
}

export function buildMagicLinkEmail({
  recipient,
  ttlMinutes,
}: BuildMagicLinkEmailParams): EmailMessage {
  return buildAccountEmail({
    recipient,
    copy: {
      subject: "emails.magicLink.subject",
      body: "emails.magicLink.body",
      expiry: "emails.magicLink.expiry",
      ignore: "emails.magicLink.ignore",
      expiryParams: { minutes: ttlMinutes },
    },
  })
}

export interface BuildDataExportReadyEmailParams {
  recipient: AccountEmailRecipient
  retentionDays: number
}

export function buildDataExportReadyEmail({
  recipient,
  retentionDays,
}: BuildDataExportReadyEmailParams): EmailMessage {
  return buildAccountEmail({
    recipient,
    copy: {
      subject: "emails.dataExportReady.subject",
      body: "emails.dataExportReady.body",
      expiry: "emails.dataExportReady.expiry",
      ignore: "emails.dataExportReady.ignore",
      expiryParams: { days: retentionDays },
    },
  })
}
