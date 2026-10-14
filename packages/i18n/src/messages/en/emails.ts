import type { Messages } from "../../types.js"

export const emails: Messages["emails"] = {
  greeting: "Hi, {name}!",
  signature: "The Contraponha team",
  linkFallback: "If the button does not work, copy and paste this address into your browser:",
  footer: "You received this email because of your Contraponha account.",
  tagline: "Conversations worth having.",
  verifyEmail: {
    subject: "Confirm your email on Contraponha",
    title: "Confirm your email",
    body: "To confirm your email and unlock all features of your account, use the button below.",
    action: "Confirm email",
    expiry: "The link is valid for {hours} hours.",
    ignore: "If you did not create a Contraponha account, you can ignore this message.",
  },
  passwordReset: {
    subject: "Reset your Contraponha password",
    title: "Reset your password",
    body: "We received a request to reset your account password. To choose a new one, use the button below.",
    action: "Choose a new password",
    expiry: "The link is valid for {minutes} minutes and can only be used once.",
    ignore: "If you did not request a reset, ignore this message. Your password stays the same.",
  },
  dataExportReady: {
    subject: "Your Contraponha data export is ready",
    title: "Your data is ready",
    body: "The data you requested is ready. To download it, sign in and go to Settings, under Your data.",
    action: "Open Your data",
    expiry: "The file is available for {days} days.",
    ignore:
      "If you did not ask for this export, change your password and sign out of other sessions in Settings.",
  },
  deletionCancelled: {
    subject: "Your Contraponha account deletion was cancelled",
    title: "Your account will no longer be deleted",
    body: "Someone signed in to your account during the 30-day period, so the scheduled deletion was cancelled.",
    action: "Open Account",
    expiry: "If you still want to delete your account, ask again in Settings, under Your data.",
    ignore:
      "If it was not you who signed in, change your password and sign out of other sessions in Settings.",
  },
}
