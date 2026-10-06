"use client"

import { useQuery } from "@tanstack/react-query"
import { CircleCheck, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { signInWithMagicLink } from "@/actions/auth"
import { FormBanner } from "@/components/auth/form-banner"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"

export interface TokenConfirmationProps {
  purpose: "magic-link" | "verify-email"
  token: string
}

// Tokens are single-use: a query keyed by the token runs exactly once, even when React
// mounts the component twice in development.
export function TokenConfirmation({ purpose, token }: TokenConfirmationProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const router = useRouter()

  const query = useQuery({
    queryKey: ["token-confirmation", purpose, token],
    queryFn: async () => {
      if (purpose === "verify-email") {
        await api.auth.confirmEmail({ token })

        return { isOnboarded: true, ok: true }
      }

      const result = await signInWithMagicLink({ token })

      if (!result.ok) throw new Error(result.message)

      return result
    },
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })

  useEffect(() => {
    if (purpose !== "magic-link" || !query.data) return

    router.replace(query.data.isOnboarded ? "/home" : "/onboarding")

    router.refresh()
  }, [purpose, query.data, router])

  if (query.isPending || (purpose === "magic-link" && query.isSuccess)) {
    return (
      <p role="status" className="flex items-center gap-3 text-muted">
        <Loader2 aria-hidden className="size-5 animate-spin" />
        {purpose === "magic-link" ? t("web.auth.magicLinkSigningIn") : t("web.auth.verifyTitle")}
      </p>
    )
  }

  if (query.isError) {
    return (
      <FormBanner
        message={
          purpose === "magic-link" ? t("web.auth.magicLinkInvalid") : t("web.auth.verifyInvalid")
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <p role="status" className="flex items-center gap-3 text-success">
        <CircleCheck aria-hidden className="size-5" />
        {t("web.auth.verifyDone")}
      </p>
      <Button asChild>
        <Link href="/home">{t("web.auth.goHome")}</Link>
      </Button>
    </div>
  )
}
