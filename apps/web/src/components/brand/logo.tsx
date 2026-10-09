import type { Route } from "next"
import Link from "next/link"

import { Wordmark } from "@contraponha/web-ui"

export interface LogoProps {
  href?: Route
  className?: string
}

export function Logo({ href = "/", className }: LogoProps): React.JSX.Element {
  return (
    <Link href={href} className="inline-block no-underline">
      <Wordmark className={className} />
    </Link>
  )
}
