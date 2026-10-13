import type { MediaView } from "@contraponha/types"

import { cn } from "@contraponha/web-ui"

const SINGLE_SIZES = "(min-width: 768px) 640px, 100vw"
const GRID_SIZES = "(min-width: 768px) 320px, 50vw"

function srcSetOf(item: MediaView): string | undefined {
  if (item.variants.length === 0) return undefined

  return item.variants.map(({ url, width }) => `${url} ${width}w`).join(", ")
}

export interface MediaGridProps {
  media: MediaView[]
  altPrefix: string
}

// The server renders WebP variants; srcset lets the browser fetch the smallest one that is
// sharp enough. Width and height reserve the space so the page does not jump as it loads.
// next/image is not used because the bucket host varies per environment.
export function MediaGrid({ media, altPrefix }: MediaGridProps): React.JSX.Element | null {
  if (media.length === 0) return null

  return (
    <div
      className={cn(
        "grid gap-1.5 overflow-hidden rounded-[12px]",
        media.length > 1 && "grid-cols-2",
      )}
    >
      {media.map((item, index) => (
        // eslint-disable-next-line @next/next/no-img-element -- see the note above
        <img
          key={item.id}
          src={item.url}
          srcSet={srcSetOf(item)}
          sizes={media.length === 1 ? SINGLE_SIZES : GRID_SIZES}
          width={item.width ?? undefined}
          height={item.height ?? undefined}
          alt={`${altPrefix} ${index + 1}`}
          loading="lazy"
          decoding="async"
          className={cn(
            "w-full bg-surface-sunken object-cover",
            media.length === 1 ? "max-h-120" : "aspect-square",
          )}
        />
      ))}
    </div>
  )
}
