import { cn } from "./cn.js"

export interface WordmarkProps {
  className?: string
  children?: React.ReactNode
}

// The brand symbol and name, without a link: each app wraps it in its own router link.
export function Wordmark({ className, children }: WordmarkProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-block font-serif text-[26px] leading-none font-bold tracking-[-0.03em] whitespace-nowrap text-ink",
        className,
      )}
    >
      <LogoSymbol className="mr-[0.3em] inline-block h-[0.9em] w-auto align-[-0.18em]" />
      contraponha
      {children}
    </span>
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
