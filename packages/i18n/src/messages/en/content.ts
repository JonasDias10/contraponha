import type { Messages } from "../../types.js"

export const content: Messages["content"] = {
  removed: "[removed]",
  removedByModeration: "[removed by moderation]",
  errors: {
    editWindowExpired:
      "Content can only be edited during the first 30 minutes. To change it, delete it and post again.",
  },
}
