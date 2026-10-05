import type { Messages } from "../../types.js"

export const auth: Messages["auth"] = {
  errors: {
    invalidCredentials: "Incorrect email or password.",
    invalidToken: "This link is invalid or has expired. Please request a new one.",
    emailAlreadyInUse: "An account with this email already exists.",
  },
}
