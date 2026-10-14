import type { LinkPreviewView } from "@contraponha/types"

export interface LinkPreviewCardProps {
  preview: LinkPreviewView
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

// The image is our own re-encoded copy, so loading it reveals nothing to the linked site.
export function LinkPreviewCard({ preview }: LinkPreviewCardProps): React.JSX.Element {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="flex flex-col overflow-hidden rounded-[12px] border border-line text-ink no-underline hover:bg-surface-sunken"
    >
      {preview.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- bucket host varies per environment
        <img
          src={preview.imageUrl}
          alt=""
          width={preview.imageWidth ?? undefined}
          height={preview.imageHeight ?? undefined}
          loading="lazy"
          decoding="async"
          className="max-h-80 w-full bg-surface-sunken object-cover"
        />
      ) : null}
      <span className="flex flex-col gap-1 px-4 py-3">
        <span className="text-[12.5px] text-subtle">{preview.siteName ?? hostOf(preview.url)}</span>
        {preview.title ? <span className="leading-snug font-semibold">{preview.title}</span> : null}
        {preview.description ? (
          <span className="line-clamp-2 text-sm text-muted">{preview.description}</span>
        ) : null}
      </span>
    </a>
  )
}
