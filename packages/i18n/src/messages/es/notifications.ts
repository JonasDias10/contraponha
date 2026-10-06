import type { Messages } from "../../types.js"

export const notifications: Messages["notifications"] = {
  postCommented: "{actor} comentó tu publicación",
  commentReplied: "{actor} respondió tu comentario",
  postReacted: "{actor} reaccionó a tu publicación",
  commentReacted: "{actor} reaccionó a tu comentario",
  userFollowed: "{actor} empezó a seguirte",
}
