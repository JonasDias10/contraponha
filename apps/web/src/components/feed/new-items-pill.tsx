"use client"

import { Button } from "@contraponha/web-ui"
import { ArrowUp } from "lucide-react"

export interface NewItemsPillProps {
  label: string
  onReveal: () => void
}

// Floats over the list when new items arrived; nothing moves until the reader asks.
export function NewItemsPill({ label, onReveal }: NewItemsPillProps): React.JSX.Element {
  return (
    <div className="sticky top-3 z-10 flex justify-center">
      <Button size="sm" className="animate-rise-in shadow-e2" onClick={onReveal}>
        <ArrowUp aria-hidden className="size-4" />
        {label}
      </Button>
    </div>
  )
}
