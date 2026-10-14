"use client"

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { useI18n } from "@contraponha/web-ui"
import type { Ref } from "react"

// Public site key; without it (local development) the check is skipped, and the API skips
// it too when it has no secret.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export interface HumanCheckProps {
  onToken: (token: string | null) => void
  ref?: Ref<TurnstileInstance | undefined>
}

// Cloudflare Turnstile: usually invisible, no tracking cookies, and accessible.
export function HumanCheck({ onToken, ref }: HumanCheckProps): React.JSX.Element | null {
  const { locale } = useI18n()

  if (!TURNSTILE_SITE_KEY) return null

  return (
    <Turnstile
      ref={ref}
      siteKey={TURNSTILE_SITE_KEY}
      options={{ language: locale, size: "flexible", theme: "auto" }}
      onSuccess={onToken}
      onExpire={() => onToken(null)}
      onError={() => onToken(null)}
    />
  )
}
