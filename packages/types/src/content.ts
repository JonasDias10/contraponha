export interface ContentSource {
  url: string
  title: string | null
  host: string
}

export const ReplyPolicy = {
  EVERYONE: "everyone",
  FOLLOWING: "following",
} as const

export type ReplyPolicy = (typeof ReplyPolicy)[keyof typeof ReplyPolicy]

// Search snippets wrap matches in these control characters instead of HTML, so clients
// render highlights without trusting markup from the server.
export const HIGHLIGHT_START = "\u0002"
export const HIGHLIGHT_END = "\u0003"
