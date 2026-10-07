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
        "inline-block font-serif text-[26px] leading-none font-bold tracking-[-0.03em] text-ink no-underline",
        className,
      )}
    >
      <LogoSymbol className="mr-[0.3em] inline-block h-[0.9em] w-auto align-[-0.18em]" />
      contraponha
    </Link>
  )
}

interface LogoSymbolProps {
  className?: string
}

function LogoSymbol({ className }: LogoSymbolProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 98 64" aria-hidden className={className}>
      <path className="fill-brand" d="M42 0A42 32 0 0 0 42 64V54A23 22 0 0 1 42 10Z" />
      <path className="fill-accent" d="M98 0A42 32 0 0 0 98 64V54A23 22 0 0 1 98 10Z" />
      <circle className="fill-accent" cx="42" cy="32" r="7" />
    </svg>
  )
}
