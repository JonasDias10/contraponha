import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/cn"

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent font-semibold leading-none no-underline transition-colors disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-brand text-on-brand hover:bg-brand-hover",
        secondary: "border-line-strong bg-surface-raised text-ink hover:bg-surface-sunken",
        quiet: "bg-surface-sunken text-ink hover:bg-line",
        ghost: "text-ink hover:bg-surface-sunken",
        link: "h-auto px-1 text-brand underline-offset-2 hover:underline",
        danger: "bg-danger text-on-danger hover:opacity-90",
        dangerOutline: "border-danger bg-transparent text-danger hover:bg-danger-soft",
      },
      size: {
        md: "h-11 px-[18px] text-[15px]",
        sm: "h-9 rounded-[8px] px-3.5 text-sm",
        lg: "h-[52px] rounded-[12px] px-6 text-base",
        icon: "size-11 p-0 text-muted",
        iconSm: "size-9 p-0 text-muted",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
)

export interface ButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  isLoading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps): React.JSX.Element {
  const classes = cn(buttonVariants({ variant, size, block }), className)

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
      {children}
    </button>
  )
}
