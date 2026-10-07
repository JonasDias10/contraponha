import type { Messages } from "../../types.js"

export const emails: Messages["emails"] = {
  greeting: "Hi, {name}!",
  signature: "The Contraponha team",
  verifyEmail: {
    subject: "Confirm your email on Contraponha",
    body: "To confirm your email and unlock all features of your account, open the link below:",
    expiry: "The link is valid for {hours} hours.",
    ignore: "If you did not create a Contraponha account, you can ignore this message.",
  },
  passwordReset: {
    subject: "Reset your Contraponha password",
    body: "We received a request to reset your account password. To choose a new password, open the link below:",
    expiry: "The link is valid for {minutes} minutes and can only be used once.",
    ignore: "If you did not request a reset, ignore this message. Your password stays the same.",
  },
  magicLink: {
    subject: "Your link to sign in to Contraponha",
    body: "To sign in to your account without a password, open the link below:",
    expiry: "The link is valid for {minutes} minutes and can be used only once.",
    ignore:
      "If you did not ask to sign in, ignore this message. Nobody gets into your account without this link.",
  },
  dataExportReady: {
    subject: "Your Contraponha data export is ready",
    body: "The data you asked for is ready. To download it, sign in and go to Settings, Your data:",
    expiry: "The file is available for {days} days.",
    ignore:
      "If you did not ask for this export, change your password and sign out of other sessions in Settings.",
  },
}
