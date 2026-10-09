import { cva, type VariantProps } from "class-variance-authority"
import { CircleAlert, Info, TriangleAlert } from "lucide-react"

import { cn } from "./cn.js"

export function Card({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div className={cn("rounded-lg border border-line bg-surface-raised", className)} {...props} />
  )
}

export function Panel({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return <div className={cn("rounded-lg bg-surface-sunken", className)} {...props} />
}

const bannerVariants = cva(
  "flex items-start gap-3 rounded-[12px] px-4 py-3.5 text-sm leading-[1.45] text-ink",
  {
    variants: {
      tone: {
        info: "bg-brand-soft",
        warning: "bg-warning-soft",
        danger: "bg-danger-soft",
        neutral: "bg-surface-sunken",
      },
    },
    defaultVariants: { tone: "info" },
  },
)

const BANNER_ICONS = {
  info: { Icon: Info, className: "text-brand" },
  warning: { Icon: TriangleAlert, className: "text-warning" },
  danger: { Icon: CircleAlert, className: "text-danger" },
  neutral: { Icon: Info, className: "text-muted" },
} as const

export interface BannerProps extends VariantProps<typeof bannerVariants> {
  icon?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function Banner({ tone, icon, className, children }: BannerProps): React.JSX.Element {
  const { Icon, className: iconClass } = BANNER_ICONS[tone ?? "info"]

  return (
    <div className={cn(bannerVariants({ tone }), className)}>
      <span aria-hidden className={cn("mt-px flex-none", iconClass)}>
        {icon ?? <Icon className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: React.ReactNode
  tone?: "neutral" | "brand" | "danger"
  className?: string
  children?: React.ReactNode
}

const STATE_ICON_TONES = {
  neutral: "bg-surface-sunken text-muted",
  brand: "bg-brand-soft text-brand",
  danger: "bg-danger-soft text-danger",
} as const

export function EmptyState({
  icon,
  title,
  description,
  tone = "neutral",
  className,
  children,
}: EmptyStateProps): React.JSX.Element {
  return (
    <section className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <span
        aria-hidden
        className={cn("grid size-16 place-items-center rounded-full", STATE_ICON_TONES[tone])}
      >
        {icon}
      </span>
      <h2 className="font-serif text-[25px] leading-tight font-semibold">{title}</h2>
      {description ? <p className="max-w-105 text-[15px] text-muted">{description}</p> : null}
      {children ? <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div> : null}
    </section>
  )
}

export interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps): React.JSX.Element {
  return (
    <span
      aria-hidden
      className={cn("block animate-pulse rounded-sm bg-surface-sunken", className)}
    />
  )
}
