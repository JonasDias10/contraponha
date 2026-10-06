import type { PartialMessages } from "../../types.js"
import { app } from "./app.js"
import { auth } from "./auth.js"
import { common } from "./common.js"
import { content } from "./content.js"
import { emails } from "./emails.js"
import { follows } from "./follows.js"
import { users } from "./users.js"

export const en: PartialMessages = { app, auth, common, content, emails, follows, users }
