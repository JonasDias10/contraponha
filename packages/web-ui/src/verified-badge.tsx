"use client"

import { verificationLabel } from "@contraponha/client-core"
import type { Verification } from "@contraponha/types"
import { BadgeCheck } from "lucide-react"

import { cn } from "./cn.js"
import { useI18n } from "./i18n-provider.js"

export interface VerifiedBadgeProps {
  verification: Verification | null
  className?: string
}

export function VerifiedBadge({
  verification,
  className,
}: VerifiedBadgeProps): React.JSX.Element | null {
  const { t } = useI18n()

  if (!verification) return null

  const label = verificationLabel({ verification, t })

  return (
    <span role="img" aria-label={label} title={label} className="inline-flex flex-none">
      <BadgeCheck aria-hidden className={cn("size-4 text-brand", className)} />
    </span>
  )
}
