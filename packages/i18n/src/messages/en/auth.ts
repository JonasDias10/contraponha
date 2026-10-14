import type { Messages } from "../../types.js"

export const auth: Messages["auth"] = {
  errors: {
    invalidCredentials: "Incorrect email or password.",
    invalidToken: "This link is invalid or has expired. Please request a new one.",
    emailAlreadyInUse: "An account with this email already exists.",
    accountSuspended: "This account is suspended for breaking the community guidelines.",
    emailNotVerified:
      "Confirm your email to publish. We sent you a link when you created the account.",
    humanCheckFailed: "We couldn't confirm you're a person. Please try again.",
    twoFactorRequired: "Turn on two-step verification to use the moderation tools.",
    invalidTwoFactorCode: "Invalid or expired code.",
  },
}
