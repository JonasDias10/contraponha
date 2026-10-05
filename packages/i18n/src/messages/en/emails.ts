import type { Messages } from "../../types.js"

export const emails: Messages["emails"] = {
  greeting: "Hi, {name}!",
  signature: "The Ponto team",
  verifyEmail: {
    subject: "Confirm your email on Ponto",
    body: "To confirm your email and unlock all features of your account, open the link below:",
    expiry: "The link is valid for {hours} hours.",
    ignore: "If you did not create a Ponto account, you can ignore this message.",
  },
  passwordReset: {
    subject: "Reset your Ponto password",
    body: "We received a request to reset your account password. To choose a new password, open the link below:",
    expiry: "The link is valid for {minutes} minutes and can only be used once.",
    ignore: "If you did not request a reset, ignore this message. Your password stays the same.",
  },
}
