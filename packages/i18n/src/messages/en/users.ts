import type { Messages } from "../../types.js"

export const users: Messages["users"] = {
  errors: {
    dataExportInProgress: "An export is already in progress. Wait for the email with the link.",
    handleUnavailable: "This username is not available.",
  },
}
