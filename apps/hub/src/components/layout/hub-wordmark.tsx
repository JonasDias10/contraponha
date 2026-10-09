import { Wordmark } from "@contraponha/web-ui"

export interface HubWordmarkProps {
  className?: string
}

export function HubWordmark({ className }: HubWordmarkProps): React.JSX.Element {
  return (
    <Wordmark className={className}>
      <span className="ml-1.5 align-[0.2em] font-sans text-[0.5em] font-semibold tracking-normal text-subtle uppercase">
        hub
      </span>
    </Wordmark>
  )
}
