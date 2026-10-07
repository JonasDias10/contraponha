import { createTranslator, type Locale, type MessageKey } from "@contraponha/i18n"

import { renderEmailLayout } from "#src/infrastructure/email/email-layout.js"
import type { EmailMessage } from "#src/infrastructure/email/email-sender.js"

export interface AccountEmailRecipient {
  to: string
  name: string
  locale: Locale
  link: string
  webAppUrl: string
}

interface EmailCopy {
  subject: MessageKey
  title: MessageKey
  body: MessageKey
  action: MessageKey
  expiry: MessageKey
  ignore: MessageKey
  expiryParams: Record<string, number>
}

interface BuildAccountEmailParams {
  recipient: AccountEmailRecipient
  copy: EmailCopy
}

function buildAccountEmail({ recipient, copy }: BuildAccountEmailParams): EmailMessage {
  const { to, name, locale, link, webAppUrl } = recipient
  const t = createTranslator({ locale })
  const greeting = t("emails.greeting", { name })
  const title = t(copy.title)
  const body = t(copy.body)
  const expiry = t(copy.expiry, copy.expiryParams)
  const ignore = t(copy.ignore)
  const signature = t("emails.signature")

  const html = renderEmailLayout({
    lang: locale,
    webAppUrl,
    preheader: body,
    title,
    paragraphs: [greeting, body],
    action: { label: t(copy.action), url: link },
    note: expiry,
    linkFallback: t("emails.linkFallback"),
    ignore,
    signature,
    footer: t("emails.footer"),
    tagline: t("emails.tagline"),
  })

  const text = [title, greeting, body, link, expiry, ignore, signature].join("\n\n")

  return { to, subject: t(copy.subject), text, html }
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
      title: "emails.verifyEmail.title",
      body: "emails.verifyEmail.body",
      action: "emails.verifyEmail.action",
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
      title: "emails.passwordReset.title",
      body: "emails.passwordReset.body",
      action: "emails.passwordReset.action",
      expiry: "emails.passwordReset.expiry",
      ignore: "emails.passwordReset.ignore",
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
      title: "emails.dataExportReady.title",
      body: "emails.dataExportReady.body",
      action: "emails.dataExportReady.action",
      expiry: "emails.dataExportReady.expiry",
      ignore: "emails.dataExportReady.ignore",
      expiryParams: { days: retentionDays },
    },
  })
}
