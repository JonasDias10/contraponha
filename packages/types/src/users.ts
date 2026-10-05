import type { Locale } from "@ponto/i18n"

export interface PublicProfile {
  id: string
  handle: string
  displayName: string
  bio: string | null
  createdAt: string
}

export interface PrivateProfile extends PublicProfile {
  email: string
  isEmailVerified: boolean
  locale: Locale
}
