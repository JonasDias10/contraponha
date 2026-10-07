import "server-only"

import { cookies } from "next/headers"

export const SESSION_COOKIE = "ponto_session"

export interface StoreSessionParams {
  token: string
  expiresAt: string
}

// The session token never reaches browser JavaScript: it lives in an httpOnly cookie and
// is attached to API calls by server components, server actions and the /api/v1 proxy.
export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value
}

export async function storeSession({ token, expiresAt }: StoreSessionParams): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.delete(SESSION_COOKIE)
}
