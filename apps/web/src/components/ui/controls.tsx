"use client"

import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { Check } from "lucide-react"

import { cn } from "@/lib/cn"

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>): React.JSX.Element {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative h-[26px] w-11 flex-none rounded-full bg-line-strong transition-colors data-[state=checked]:bg-brand",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5 translate-x-[3px] rounded-full bg-white shadow-e1 transition-transform data-[state=checked]:translate-x-[21px] data-[state=checked]:bg-on-brand" />
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
        "mt-px grid size-[22px] flex-none place-items-center rounded-sm border-[1.5px] border-line-strong bg-surface-raised data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-on-brand",
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
        "mt-px grid size-[22px] flex-none place-items-center rounded-full border-[1.5px] border-line-strong data-[state=checked]:border-2 data-[state=checked]:border-brand",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-brand" />
    </RadioGroupPrimitive.Item>
  )
}

// Two or three mutually exclusive views, as in "Following | Discover".
export const Segmented = TabsPrimitive.Root

export function SegmentedList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>): React.JSX.Element {
  return (
    <TabsPrimitive.List
      className={cn("flex gap-1 rounded-[12px] bg-surface-sunken p-1", className)}
      {...props}
    />
  )
}

export function SegmentedItem({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>): React.JSX.Element {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "grid h-9 flex-1 place-items-center whitespace-nowrap rounded-[9px] px-3 text-sm font-medium text-muted data-[state=active]:bg-surface-raised data-[state=active]:font-semibold data-[state=active]:text-ink data-[state=active]:shadow-e1",
        className,
      )}
      {...props}
    />
  )
}

export const SegmentedContent = TabsPrimitive.Content
