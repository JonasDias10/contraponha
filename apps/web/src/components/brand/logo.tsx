import type { Route } from "next"
import Link from "next/link"

import { cn } from "@/lib/cn"

export interface LogoProps {
  href?: Route
  className?: string
}

export function Logo({ href = "/", className }: LogoProps): React.JSX.Element {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-baseline font-serif text-[26px] leading-none font-bold tracking-[-0.03em] text-ink no-underline",
        className,
      )}
    >
      contraponha
      <span aria-hidden className="ml-[0.06em] inline-block size-[0.26em] rounded-full bg-brand" />
    </Link>
  )
}
