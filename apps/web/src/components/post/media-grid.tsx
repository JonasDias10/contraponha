import type { MediaView } from "@contraponha/types"

import { cn } from "@contraponha/web-ui"

export interface MediaGridProps {
  media: MediaView[]
  altPrefix: string
}

// Images come from the media bucket's public URL; next/image is not used because the host
// differs per environment and the files are already sized at upload.
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
          alt={`${altPrefix} ${index + 1}`}
          loading="lazy"
          className={cn(
            "w-full bg-surface-sunken object-cover",
            media.length === 1 ? "max-h-120" : "aspect-square",
          )}
        />
      ))}
    </div>
  )
}
