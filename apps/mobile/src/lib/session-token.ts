// The app has a single session; the API client reads it at request time, outside of rendering.
let currentToken: string | null = null

export function getSessionToken(): string | null {
  return currentToken
}

export function setSessionToken(token: string | null): void {
  currentToken = token
}
