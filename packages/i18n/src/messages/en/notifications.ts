import type { Messages } from "../../types.js"

export const notifications: Messages["notifications"] = {
  postCommented: "{actor} commented on your post",
  commentReplied: "{actor} replied to your comment",
  postReacted: "{actor} reacted to your post",
  commentReacted: "{actor} reacted to your comment",
  userFollowed: "{actor} started following you",
}
