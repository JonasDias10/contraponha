import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/cn"

export const tagVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap no-underline",
  {
    variants: {
      variant: {
        default: "border-line bg-surface-sunken text-ink hover:border-line-strong",
        selected: "border-transparent bg-brand-soft font-semibold text-brand",
        topic: "border-line bg-transparent text-muted hover:text-ink",
      },
      size: {
        sm: "h-6.5 px-2.5 text-[13px]",
        md: "h-8 px-3 text-sm",
        lg: "h-11 px-4 text-[15px]",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
)

const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs/4.5 font-semibold",
  {
    variants: {
      tone: {
        brand: "bg-brand-soft text-brand",
        accent: "bg-accent-soft text-accent",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        neutral: "bg-surface-sunken text-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
)

export interface ChipProps extends VariantProps<typeof chipVariants> {
  className?: string
  children: React.ReactNode
}

export function Chip({ tone, className, children }: ChipProps): React.JSX.Element {
  return <span className={cn(chipVariants({ tone }), className)}>{children}</span>
}

export interface UnreadDotProps {
  label: string
}

export function UnreadDot({ label }: UnreadDotProps): React.JSX.Element {
  return <span role="img" aria-label={label} className="size-2 flex-none rounded-full bg-brand" />
}
