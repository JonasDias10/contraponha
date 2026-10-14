import { MAILPIT_URL } from "./env.js"

interface MailpitSearch {
  messages: { ID: string }[]
}

interface MailpitMessage {
  Text: string
}

const POLL_MS = 250
const TIMEOUT_MS = 15_000

async function latestMessageTo(email: string): Promise<MailpitMessage | null> {
  const query = encodeURIComponent(`to:"${email}"`)
  const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}&limit=1`)
  const { messages } = (await search.json()) as MailpitSearch
  const [latest] = messages

  if (!latest) return null

  const message = await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`)

  return (await message.json()) as MailpitMessage
}

export interface LinkFromEmailParams {
  email: string
  path: string
}

// The API sends real email through SMTP to Mailpit; this reads the first link with the path.
export async function linkFromEmail({ email, path }: LinkFromEmailParams): Promise<string> {
  const deadline = Date.now() + TIMEOUT_MS

  while (Date.now() < deadline) {
    const message = await latestMessageTo(email)
    const link = message?.Text.match(new RegExp(`https?://\\S+${path}\\S*`))?.[0]

    if (link) return link

    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }

  throw new Error(`No email with ${path} reached ${email}`)
}
