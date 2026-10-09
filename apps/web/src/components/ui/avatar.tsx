import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/cn"

const avatarVariants = cva(
  "relative inline-grid flex-none place-items-center overflow-hidden rounded-full font-semibold tracking-[0.01em]",
  {
    variants: {
      size: {
        xs: "size-6 text-[10px]",
        sm: "size-8 text-xs",
        md: "size-10 text-[15px]",
        lg: "size-14 text-xl",
        xl: "size-24 font-serif text-[34px]",
        xxl: "size-30 font-serif text-[42px]",
      },
    },
    defaultVariants: { size: "md" },
  },
)

const TONES = 6

function toneOf(seed: string): number {
  let hash = 0

  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0

  return (hash % TONES) + 1
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ""
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? "") : ""

  return `${first}${last}`.toUpperCase()
}

export interface AvatarProps extends VariantProps<typeof avatarVariants> {
  id: string
  name: string
  src?: string | null
  className?: string
}

// Initials over one of six fixed tones derived from the id, so a person keeps their color.
// A photo covers the initials; the empty alt keeps a broken image from showing an icon.
export function Avatar({ id, name, src, size, className }: AvatarProps): React.JSX.Element {
  const tone = toneOf(id)

  return (
    <span
      aria-hidden
      className={cn(avatarVariants({ size }), className)}
      style={{ background: `var(--av-${tone}-bg)`, color: `var(--av-${tone}-ink)` }}
    >
      {initialsOf(name) || "·"}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- bucket host varies per environment
        <img src={src} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : null}
    </span>
  )
}
