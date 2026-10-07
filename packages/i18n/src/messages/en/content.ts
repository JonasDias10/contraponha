import type { Messages } from "../../types.js"

export const content: Messages["content"] = {
  removed: "[removed]",
  removedByModeration: "[removed by moderation]",
  errors: {
    reactionLimitReached: "You can give at most 2 reactions. Remove one before choosing another.",
    repliesRestricted: "The author limited contributions to people they follow.",
    editWindowExpired:
      "Content can only be edited during the first 30 minutes. To change it, delete it and post again.",
  },
}
