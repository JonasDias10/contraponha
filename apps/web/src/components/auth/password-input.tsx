"use client"

import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"

import { useI18n } from "@/components/providers/i18n-provider"
import { inputClasses } from "@/components/ui/field"
import { cn } from "@/lib/cn"

export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">): React.JSX.Element {
  const { t } = useI18n()
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative">
      <input
        type={isVisible ? "text" : "password"}
        className={cn(inputClasses, "pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={isVisible ? t("web.auth.hidePassword") : t("web.auth.showPassword")}
        className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-subtle hover:text-ink"
      >
        {isVisible ? (
          <EyeOff aria-hidden className="size-5" />
        ) : (
          <Eye aria-hidden className="size-5" />
        )}
      </button>
    </div>
  )
}
