"use client"

import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { Check } from "lucide-react"
import { createContext, use } from "react"

import { cn } from "./cn.js"

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>): React.JSX.Element {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative h-6.5 w-11 flex-none rounded-full bg-line-strong transition-colors data-[state=checked]:bg-brand",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5 translate-x-0.75 rounded-full bg-white shadow-e1 transition-transform data-[state=checked]:translate-x-5.25 data-[state=checked]:bg-on-brand" />
    </SwitchPrimitive.Root>
  )
}

export function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>): React.JSX.Element {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "mt-px grid size-5.5 flex-none place-items-center rounded-sm border-[1.5px] border-line-strong bg-surface-raised data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-on-brand",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check aria-hidden className="size-4" strokeWidth={2.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export const RadioGroup = RadioGroupPrimitive.Root

export function RadioItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>): React.JSX.Element {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "mt-px grid size-5.5 flex-none place-items-center rounded-full border-[1.5px] border-line-strong data-[state=checked]:border-2 data-[state=checked]:border-brand",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-brand" />
    </RadioGroupPrimitive.Item>
  )
}

interface SegmentedState {
  value: string | undefined
  onValueChange: ((value: string) => void) | undefined
}

const SegmentedContext = createContext<SegmentedState>({
  value: undefined,
  onValueChange: undefined,
})

export interface SegmentedProps extends SegmentedState {
  children: React.ReactNode
}

// Two or three mutually exclusive views, as in "Following | Discover". A radio group, not
// tabs: the choice filters the content below instead of switching between tab panels.
export function Segmented({ value, onValueChange, children }: SegmentedProps): React.JSX.Element {
  return <SegmentedContext value={{ value, onValueChange }}>{children}</SegmentedContext>
}

export function SegmentedList({
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof RadioGroupPrimitive.Root>,
  "value" | "onValueChange"
>): React.JSX.Element {
  const { value, onValueChange } = use(SegmentedContext)

  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      orientation="horizontal"
      className={cn("flex gap-1 rounded-[12px] bg-surface-sunken p-1", className)}
      {...props}
    />
  )
}

export function SegmentedItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>): React.JSX.Element {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "grid h-9 flex-1 place-items-center rounded-[9px] px-3 text-sm font-medium whitespace-nowrap text-muted data-[state=checked]:bg-surface-raised data-[state=checked]:font-semibold data-[state=checked]:text-ink data-[state=checked]:shadow-e1",
        className,
      )}
      {...props}
    />
  )
}
