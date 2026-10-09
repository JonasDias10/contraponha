// Posts and profiles live in the web app; the hub links out to them.
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? ""

export const webLinks = {
  post: (postId: string): string => `${WEB_URL}/posts/${postId}`,
  profile: (handle: string): string => `${WEB_URL}/u/${encodeURIComponent(handle)}`,
  home: (): string => `${WEB_URL}/home`,
}
