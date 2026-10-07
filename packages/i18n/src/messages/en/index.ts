import type { PartialMessages } from "../../types.js"
import { app } from "./app.js"
import { auth } from "./auth.js"
import { common } from "./common.js"
import { content } from "./content.js"
import { emails } from "./emails.js"
import { follows } from "./follows.js"
import { media } from "./media.js"
import { moderation } from "./moderation.js"
import { notifications } from "./notifications.js"
import { users } from "./users.js"
import { web } from "./web.js"

export const en: PartialMessages = {
  app,
  auth,
  common,
  content,
  emails,
  follows,
  media,
  moderation,
  notifications,
  users,
  web,
}
